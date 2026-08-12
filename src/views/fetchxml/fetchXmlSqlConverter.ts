type ConvertDirection = 'fetchxml-to-sql' | 'sql-to-fetchxml'

type StatusKind = 'info' | 'success' | 'error'

interface ConvertResult {
  output: string
  message: string
  status: StatusKind
}

type ComparisonOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'ge'
  | 'lt'
  | 'le'
  | 'like'
  | 'not-like'
  | 'in'
  | 'not-in'
  | 'null'
  | 'not-null'

interface ConditionNode {
  kind: 'condition'
  field: string
  operator: ComparisonOperator
  value?: string
  values?: string[]
}

interface FilterNode {
  kind: 'filter'
  type: 'and' | 'or'
  items: Array<ConditionNode | FilterNode>
}

type ExpressionNode = ConditionNode | FilterNode

interface SelectField {
  expression: string
  alias?: string
  kind: 'column' | 'aggregate'
}

interface JoinSpec {
  name: string
  alias: string
  from: string
  to: string
  linkType: 'inner' | 'outer'
  fields: SelectField[]
  filter?: FilterNode
}

interface OrderSpec {
  field: string
  direction: 'asc' | 'desc'
}

interface QueryModel {
  entityName: string
  entityAlias: string
  fields: SelectField[]
  allAttributes: boolean
  distinct: boolean
  top?: number
  filter?: FilterNode
  joins: JoinSpec[]
  orders: OrderSpec[]
  groupBy: string[]
}

interface ParsedSelectSegment {
  allAttributes: boolean
  fields: SelectField[]
}

const DEFAULT_XML_INDENT = '  '
const DEFAULT_STATUS: StatusKind = 'success'

const OPERATORS_TO_SQL: Record<ComparisonOperator, string> = {
  eq: '=',
  ne: '<>',
  gt: '>',
  ge: '>=',
  lt: '<',
  le: '<=',
  like: 'LIKE',
  'not-like': 'NOT LIKE',
  in: 'IN',
  'not-in': 'NOT IN',
  null: 'IS NULL',
  'not-null': 'IS NOT NULL',
}

const SQL_TO_FETCH_OPERATOR: Record<string, ComparisonOperator> = {
  '=': 'eq',
  '<>': 'ne',
  '!=': 'ne',
  '>': 'gt',
  '>=': 'ge',
  '<': 'lt',
  '<=': 'le',
  LIKE: 'like',
  'NOT LIKE': 'not-like',
  IN: 'in',
  'NOT IN': 'not-in',
  'IS NULL': 'null',
  'IS NOT NULL': 'not-null',
}

const AGGREGATE_FUNCTIONS = new Set(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'])

export { type ConvertDirection, type ConvertResult }

export const convertContent = (input: string, direction: ConvertDirection): ConvertResult => {
  if (!input.trim()) {
    throw new Error(
      direction === 'fetchxml-to-sql'
        ? '请输入 FetchXml 内容后再执行转换。'
        : '请输入 SQL 内容后再执行转换。',
    )
  }

  return direction === 'fetchxml-to-sql' ? fetchXmlToSql(input) : sqlToFetchXml(input)
}

export const fetchXmlToSql = (input: string): ConvertResult => {
  const xml = parseXml(input)
  const model = buildModelFromFetchXml(xml)
  const sql = buildSql(model)
  return {
    output: sql,
    message: '转换完成：已生成 SQL。',
    status: DEFAULT_STATUS,
  }
}

export const sqlToFetchXml = (input: string): ConvertResult => {
  const model = parseSqlToModel(input)
  const fetchXml = buildFetchXml(model)
  return {
    output: fetchXml,
    message: '转换完成：已生成 FetchXml。',
    status: DEFAULT_STATUS,
  }
}

const parseXml = (input: string) => {
  const parser = new DOMParser()
  const xml = parser.parseFromString(input, 'application/xml')
  const errorNode = xml.querySelector('parsererror')
  if (errorNode) {
    throw new Error(`FetchXml 解析失败：${errorNode.textContent?.trim() ?? 'XML 格式无效'}`)
  }
  return xml
}

const buildModelFromFetchXml = (xml: Document): QueryModel => {
  const fetchNode = xml.querySelector('fetch')
  if (!fetchNode) {
    throw new Error('FetchXml 缺少根节点 fetch。')
  }

  const entityNode = fetchNode.querySelector(':scope > entity')
  if (!entityNode) {
    throw new Error('FetchXml 缺少 entity 节点。')
  }

  const entityName = requireAttribute(entityNode, 'name', 'entity')
  const entityAlias = entityNode.getAttribute('alias')?.trim() || entityName
  const allAttributes = Array.from(entityNode.children).some(
    (node) => node.tagName === 'all-attributes',
  )
  const distinct = fetchNode.getAttribute('distinct') === 'true'
  const topRaw = fetchNode.getAttribute('top')
  const top = topRaw ? parsePositiveInteger(topRaw, 'fetch top') : undefined

  const fields = collectFieldsFromEntity(entityNode, entityAlias)
  const joins = Array.from(entityNode.children)
    .filter((node) => node.tagName === 'link-entity')
    .map((node) => parseLinkEntity(node, entityAlias))

  const orders = Array.from(entityNode.children)
    .filter((node) => node.tagName === 'order')
    .map(parseOrderNode)

  const rootFilterNode = Array.from(entityNode.children).find((node) => node.tagName === 'filter')
  const filter = rootFilterNode ? parseFilterNode(rootFilterNode) : undefined

  const groupBy = fields
    .filter((field) => field.kind === 'column' && field.expression.includes(' GROUP_KEY '))
    .map((field) => field.expression.replace(' GROUP_KEY ', ''))

  const normalizedFields = fields.map((field) => {
    if (field.kind === 'column' && field.expression.includes(' GROUP_KEY ')) {
      return { ...field, expression: field.expression.replace(' GROUP_KEY ', '') }
    }
    return field
  })

  if (!allAttributes && !normalizedFields.length && !joins.some((join) => join.fields.length)) {
    throw new Error('FetchXml 至少需要一个 attribute 节点，或使用 all-attributes。')
  }

  return {
    entityName,
    entityAlias,
    fields: normalizedFields,
    allAttributes,
    distinct,
    top,
    filter,
    joins,
    orders,
    groupBy,
  }
}

const collectFieldsFromEntity = (entityNode: Element, entityAlias: string): SelectField[] => {
  return Array.from(entityNode.children)
    .filter((node) => node.tagName === 'attribute')
    .map((node) => parseAttributeNode(node, entityAlias))
}

const parseAttributeNode = (node: Element, defaultAlias: string): SelectField => {
  const name = requireAttribute(node, 'name', 'attribute')
  const alias = node.getAttribute('alias')?.trim() || undefined
  const aggregate = node.getAttribute('aggregate')?.trim()?.toLowerCase()
  const groupBy = node.getAttribute('groupby') === 'true'
  const entityAlias = node.getAttribute('entityname')?.trim() || defaultAlias
  const expression = `${entityAlias}.${name}`

  if (aggregate) {
    if (!AGGREGATE_FUNCTIONS.has(aggregate.toUpperCase())) {
      throw new Error(`暂不支持的聚合函数：${aggregate}`)
    }
    return {
      kind: 'aggregate',
      expression: `${aggregate.toUpperCase()}(${expression})`,
      alias: alias || `${aggregate}_${name}`,
    }
  }

  if (groupBy) {
    return {
      kind: 'column',
      expression: `${expression} GROUP_KEY `,
      alias,
    }
  }

  return {
    kind: 'column',
    expression,
    alias,
  }
}

const parseLinkEntity = (node: Element, parentAlias: string): JoinSpec => {
  const name = requireAttribute(node, 'name', 'link-entity')
  const alias = node.getAttribute('alias')?.trim() || name
  const from = requireAttribute(node, 'from', 'link-entity')
  const to = requireAttribute(node, 'to', 'link-entity')
  const linkType = (node.getAttribute('link-type')?.trim() || 'inner').toLowerCase()

  if (linkType !== 'inner' && linkType !== 'outer') {
    throw new Error(`暂不支持的 link-type：${linkType}`)
  }

  const nestedLinks = Array.from(node.children).filter((child) => child.tagName === 'link-entity')
  if (nestedLinks.length) {
    throw new Error('暂不支持多层嵌套的 link-entity。')
  }

  const fields = Array.from(node.children)
    .filter((child) => child.tagName === 'attribute')
    .map((child) => parseAttributeNode(child, alias))

  const filterNode = Array.from(node.children).find((child) => child.tagName === 'filter')

  return {
    name,
    alias,
    from,
    to,
    linkType,
    fields,
    filter: filterNode ? parseFilterNode(filterNode) : undefined,
  }
}

const parseOrderNode = (node: Element): OrderSpec => {
  const attribute = requireAttribute(node, 'attribute', 'order')
  const alias = node.getAttribute('entityname')?.trim()
  const direction = node.getAttribute('descending') === 'true' ? 'desc' : 'asc'
  return {
    field: alias ? `${alias}.${attribute}` : attribute,
    direction,
  }
}

const parseFilterNode = (node: Element): FilterNode => {
  const type = (node.getAttribute('type')?.trim().toLowerCase() || 'and') as 'and' | 'or'
  if (type !== 'and' && type !== 'or') {
    throw new Error(`暂不支持的 filter type：${type}`)
  }

  const items = Array.from(node.children).map((child) => {
    if (child.tagName === 'filter') {
      return parseFilterNode(child)
    }
    if (child.tagName === 'condition') {
      return parseConditionNode(child)
    }
    throw new Error(`暂不支持的 filter 子节点：${child.tagName}`)
  })

  if (!items.length) {
    throw new Error('filter 节点不能为空。')
  }

  return {
    kind: 'filter',
    type,
    items,
  }
}

const parseConditionNode = (node: Element): ConditionNode => {
  const attribute = requireAttribute(node, 'attribute', 'condition')
  const entityAlias = node.getAttribute('entityname')?.trim()
  const operator = (node.getAttribute('operator')?.trim().toLowerCase() ||
    'eq') as ComparisonOperator
  const field = entityAlias ? `${entityAlias}.${attribute}` : attribute

  if (!(operator in OPERATORS_TO_SQL)) {
    throw new Error(`暂不支持的条件操作符：${operator}`)
  }

  if (operator === 'null' || operator === 'not-null') {
    return { kind: 'condition', field, operator }
  }

  if (operator === 'in' || operator === 'not-in') {
    const values = Array.from(node.children)
      .filter((child) => child.tagName === 'value')
      .map((child) => child.textContent?.trim() || '')
      .filter(Boolean)
    if (!values.length) {
      throw new Error(`${attribute} 的 ${operator} 条件缺少 value 子节点。`)
    }
    return { kind: 'condition', field, operator, values }
  }

  const value = node.getAttribute('value')
  if (value == null) {
    throw new Error(`${attribute} 条件缺少 value 属性。`)
  }

  return {
    kind: 'condition',
    field,
    operator,
    value,
  }
}

const buildSql = (model: QueryModel) => {
  const selectFields = [
    ...(model.allAttributes ? ['*'] : model.fields.map(formatSelectField)),
    ...model.joins.flatMap((join) => join.fields.map(formatSelectField)),
  ]

  const distinctClause = model.distinct ? 'DISTINCT ' : ''
  const topClause = model.top ? `TOP ${model.top} ` : ''
  const selectClause = `SELECT ${distinctClause}${topClause}${selectFields.join(', ')}`
  const fromClause = `FROM ${model.entityName} ${model.entityAlias}`
  const joinClauses = model.joins.map((join) => {
    const joinKeyword = join.linkType === 'outer' ? 'LEFT JOIN' : 'INNER JOIN'
    const onClause = `${join.alias}.${join.from} = ${model.entityAlias}.${join.to}`
    const filterClause = join.filter ? ` AND ${buildSqlWhere(join.filter)}` : ''
    return `${joinKeyword} ${join.name} ${join.alias} ON ${onClause}${filterClause}`
  })
  const whereClause = model.filter ? `WHERE ${buildSqlWhere(model.filter)}` : ''
  const groupByClause = model.groupBy.length ? `GROUP BY ${model.groupBy.join(', ')}` : ''
  const orderByClause = model.orders.length
    ? `ORDER BY ${model.orders.map((item) => `${item.field} ${item.direction.toUpperCase()}`).join(', ')}`
    : ''

  return [selectClause, fromClause, ...joinClauses, whereClause, groupByClause, orderByClause]
    .filter(Boolean)
    .join('\n')
}

const formatSelectField = (field: SelectField) => {
  if (field.alias) {
    return `${field.expression} AS ${field.alias}`
  }
  return field.expression
}

const buildSqlWhere = (node: ExpressionNode): string => {
  if (node.kind === 'condition') {
    if (node.operator === 'null' || node.operator === 'not-null') {
      return `${node.field} ${OPERATORS_TO_SQL[node.operator]}`
    }
    if (node.operator === 'in' || node.operator === 'not-in') {
      return `${node.field} ${OPERATORS_TO_SQL[node.operator]} (${(node.values || []).map(quoteSqlValue).join(', ')})`
    }
    return `${node.field} ${OPERATORS_TO_SQL[node.operator]} ${quoteSqlValue(node.value || '')}`
  }

  const parts = node.items.map((item) => {
    const text = buildSqlWhere(item)
    return item.kind === 'filter' ? `(${text})` : text
  })

  return parts.join(` ${node.type.toUpperCase()} `)
}

const quoteSqlValue = (value: string) => {
  if (value.trim() === '') {
    return "''"
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return value
  }
  if (/^(true|false)$/i.test(value)) {
    return value.toUpperCase()
  }
  return `'${value.replace(/'/g, "''")}'`
}

const parseSqlToModel = (input: string): QueryModel => {
  const normalized = normalizeSql(input)
  rejectUnsupportedSql(normalized)

  const selectMatch = normalized.match(
    /^SELECT\s+(DISTINCT\s+)?(?:TOP\s+(\d+)\s+)?([\s\S]+?)\s+FROM\s+/i,
  )
  if (!selectMatch) {
    throw new Error('仅支持以 SELECT 开头的查询。')
  }

  const distinct = Boolean(selectMatch[1])
  const top = selectMatch[2] ? parsePositiveInteger(selectMatch[2], 'TOP') : undefined
  const selectSegment = requireCapturedValue(selectMatch[3], 'SELECT 字段列表').trim()
  const afterFrom = normalized.slice(selectMatch[0].length)
  const segments = splitSqlSegments(afterFrom)
  const fromInfo = parseFromClause(segments.from)
  const parsedSelect = parseSelectFields(selectSegment, fromInfo.alias)
  const parsedFields = parsedSelect.fields
  const joins = segments.joins.map((clause) => parseJoinClause(clause, fromInfo.alias))
  const filter = segments.where ? parseWhereClause(segments.where) : undefined
  const orders = segments.orderBy ? parseOrderByClause(segments.orderBy) : []
  const groupBy = segments.groupBy ? parseGroupByClause(segments.groupBy) : []

  const joinAliases = new Set(joins.map((join) => join.alias))
  const baseFields = parsedFields.filter(
    (field) => extractFieldAlias(field.expression, fromInfo.alias) === fromInfo.alias,
  )
  const fields = parsedSelect.allAttributes ? [] : baseFields

  for (const join of joins) {
    join.fields = parsedFields.filter(
      (field) => extractFieldAlias(field.expression, fromInfo.alias) === join.alias,
    )
  }

  const unknownAliasField = parsedFields.find((field) => {
    const alias = extractFieldAlias(field.expression, fromInfo.alias)
    return alias !== fromInfo.alias && !joinAliases.has(alias)
  })
  if (unknownAliasField) {
    throw new Error(`SELECT 字段引用了未声明的别名：${unknownAliasField.expression}`)
  }

  if (parsedSelect.allAttributes && groupBy.length) {
    throw new Error('SELECT * 暂不支持与 GROUP BY 同时使用。')
  }

  if (parsedSelect.allAttributes && parsedFields.some((field) => field.kind === 'aggregate')) {
    throw new Error('SELECT * 暂不支持与聚合字段同时使用。')
  }

  validateAggregateUsage([...fields, ...joins.flatMap((join) => join.fields)], groupBy)

  return {
    entityName: fromInfo.name,
    entityAlias: fromInfo.alias,
    fields,
    allAttributes: parsedSelect.allAttributes,
    distinct,
    top,
    filter,
    joins,
    orders,
    groupBy,
  }
}

const normalizeSql = (input: string) => input.trim().replace(/;\s*$/, '').replace(/\s+/g, ' ')

const rejectUnsupportedSql = (sql: string) => {
  const unsupported = [' UNION ', ' HAVING ', ' EXISTS ', ' WITH ', ' OVER ', ' CASE ']
  const found = unsupported.find((keyword) => sql.toUpperCase().includes(keyword))
  if (found) {
    throw new Error(`暂不支持的 SQL 语法：${found.trim()}`)
  }
}

const splitSqlSegments = (afterFromClause: string) => {
  const upper = afterFromClause.toUpperCase()
  const whereIndex = findClauseIndex(upper, ' WHERE ')
  const groupByIndex = findClauseIndex(upper, ' GROUP BY ')
  const orderByIndex = findClauseIndex(upper, ' ORDER BY ')

  const cutIndexes = [whereIndex, groupByIndex, orderByIndex].filter((index) => index >= 0)
  const fromEnd = cutIndexes.length ? Math.min(...cutIndexes) : afterFromClause.length
  const fromSegment = afterFromClause.slice(0, fromEnd).trim()

  const whereSegment =
    whereIndex >= 0
      ? sliceSegment(afterFromClause, whereIndex + 7, [groupByIndex, orderByIndex])
      : ''
  const groupBySegment =
    groupByIndex >= 0 ? sliceSegment(afterFromClause, groupByIndex + 10, [orderByIndex]) : ''
  const orderBySegment = orderByIndex >= 0 ? afterFromClause.slice(orderByIndex + 10).trim() : ''

  const joins = extractJoinClauses(fromSegment)
  const from = joins.baseFrom

  return {
    from,
    joins: joins.joinClauses,
    where: whereSegment,
    groupBy: groupBySegment,
    orderBy: orderBySegment,
  }
}

const findClauseIndex = (source: string, keyword: string) => source.indexOf(keyword)

const sliceSegment = (source: string, start: number, nextIndexes: number[]) => {
  const valid = nextIndexes.filter((index) => index >= 0)
  const end = valid.length ? Math.min(...valid) : source.length
  return source.slice(start, end).trim()
}

const extractJoinClauses = (segment: string) => {
  const joinPattern = /\s+(INNER JOIN|LEFT JOIN)\s+/gi
  const matches = Array.from(segment.matchAll(joinPattern))
  if (!matches.length) {
    return { baseFrom: segment.trim(), joinClauses: [] as string[] }
  }

  const firstMatch = matches[0]
  if (firstMatch?.index == null) {
    throw new Error('无法定位第一个 JOIN 子句。')
  }
  const firstIndex = firstMatch.index
  const baseFrom = segment.slice(0, firstIndex).trim()
  const joinClauses = matches.map((match, index) => {
    const start = match.index ?? 0
    const nextMatch = index + 1 < matches.length ? matches[index + 1] : undefined
    const end = nextMatch?.index ?? segment.length
    return segment
      .slice(start)
      .slice(0, end - start)
      .trim()
  })

  return { baseFrom, joinClauses }
}

const parseFromClause = (clause: string) => {
  const match = clause.match(/^([A-Za-z_][\w]*)(?:\s+([A-Za-z_][\w]*))?$/)
  if (!match) {
    throw new Error(`无法解析 FROM 子句：${clause}`)
  }
  return {
    name: requireCapturedValue(match[1], 'FROM 实体名'),
    alias: match[2] || requireCapturedValue(match[1], 'FROM 实体别名'),
  }
}

const parseSelectFields = (segment: string, baseAlias: string): ParsedSelectSegment => {
  const normalizedSegment = segment.trim()
  if (normalizedSegment === '*' || normalizedSegment === `${baseAlias}.*`) {
    return {
      allAttributes: true,
      fields: [] as SelectField[],
    }
  }

  let allAttributes = false
  const fields: SelectField[] = []

  for (const part of splitByComma(segment)) {
    const trimmed = part.trim()
    if (!trimmed) {
      continue
    }

    if (trimmed === '*' || trimmed === `${baseAlias}.*`) {
      allAttributes = true
      continue
    }

    if (/^[A-Za-z_][\w]*\.\*$/.test(trimmed)) {
      throw new Error(`暂不支持非主实体通配符：${trimmed}`)
    }

    const aliasMatch = trimmed.match(/^(.*?)\s+AS\s+([A-Za-z_][\w]*)$/i)
    const expression = (aliasMatch?.[1] || trimmed).trim()
    const alias = aliasMatch?.[2]

    const aggregateMatch = expression.match(/^(COUNT|SUM|AVG|MIN|MAX)\((.+)\)$/i)
    if (aggregateMatch) {
      const func = requireCapturedValue(aggregateMatch[1], '聚合函数')
      const rawField = requireCapturedValue(aggregateMatch[2], '聚合字段')
      const aggregateField: SelectField = {
        kind: 'aggregate',
        expression: `${func.toUpperCase()}(${rawField.trim()})`,
        alias,
      }
      fields.push(aggregateField)
      continue
    }

    if (!/^[A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)?$/.test(expression)) {
      throw new Error(`暂不支持的 SELECT 字段表达式：${expression}`)
    }

    const columnField: SelectField = {
      kind: 'column',
      expression,
      alias,
    }
    fields.push(columnField)
  }

  return {
    allAttributes,
    fields,
  }
}

const splitByComma = (text: string) => {
  const result: string[] = []
  let depth = 0
  let current = ''

  for (const char of text) {
    if (char === '(') depth += 1
    if (char === ')') depth -= 1
    if (char === ',' && depth === 0) {
      result.push(current)
      current = ''
      continue
    }
    current += char
  }

  if (current.trim()) {
    result.push(current)
  }

  return result
}

const parseJoinClause = (clause: string, baseAlias: string): JoinSpec => {
  const match = clause.match(
    /^(INNER JOIN|LEFT JOIN)\s+([A-Za-z_][\w]*)(?:\s+([A-Za-z_][\w]*))?\s+ON\s+(.+)$/i,
  )
  if (!match) {
    throw new Error(`无法解析 JOIN 子句：${clause}`)
  }

  const joinKeyword = requireCapturedValue(match[1], 'JOIN 类型')
  const joinType = joinKeyword.toUpperCase() === 'LEFT JOIN' ? 'outer' : 'inner'
  const name = requireCapturedValue(match[2], 'JOIN 实体名')
  const alias = match[3] || name
  const onExpression = requireCapturedValue(match[4], 'JOIN ON 条件').trim()
  const onParts = onExpression.split(/\s+AND\s+/i)
  const linkPart = onParts.shift()
  if (!linkPart) {
    throw new Error(`JOIN 缺少 ON 条件：${clause}`)
  }

  const joinMatch = linkPart.match(
    /^([A-Za-z_][\w]*)\.([A-Za-z_][\w]*)\s*=\s*([A-Za-z_][\w]*)\.([A-Za-z_][\w]*)$/,
  )
  if (!joinMatch) {
    throw new Error(`暂不支持的 JOIN 连接条件：${linkPart}`)
  }

  const leftAlias = requireCapturedValue(joinMatch[1], 'JOIN 左别名')
  const leftField = requireCapturedValue(joinMatch[2], 'JOIN 左字段')
  const rightAlias = requireCapturedValue(joinMatch[3], 'JOIN 右别名')
  const rightField = requireCapturedValue(joinMatch[4], 'JOIN 右字段')

  let fromField = ''
  let toField = ''
  if (leftAlias === alias && rightAlias === baseAlias) {
    fromField = leftField
    toField = rightField
  } else if (rightAlias === alias && leftAlias === baseAlias) {
    fromField = rightField
    toField = leftField
  } else {
    throw new Error('JOIN 连接条件必须发生在主实体与当前关联实体之间。')
  }

  const filter = onParts.length ? parseWhereClause(onParts.join(' AND ')) : undefined

  return {
    name,
    alias,
    from: fromField,
    to: toField,
    linkType: joinType,
    fields: [],
    filter,
  }
}

const parseWhereClause = (clause: string): FilterNode => {
  const tokens = tokenizeWhere(clause)
  const parser = createWhereParser(tokens)
  const expression = parser.parseExpression()
  if (!parser.isDone()) {
    throw new Error(`WHERE 子句存在无法识别的内容：${parser.peek()?.value || ''}`)
  }
  return expression.kind === 'filter'
    ? expression
    : { kind: 'filter', type: 'and', items: [expression] }
}

type Token = { type: 'word' | 'string' | 'number' | 'paren' | 'comma' | 'operator'; value: string }

const tokenizeWhere = (input: string): Token[] => {
  const tokens: Token[] = []
  let index = 0

  while (index < input.length) {
    const char = input[index]
    if (!char) {
      break
    }
    if (/\s/.test(char)) {
      index += 1
      continue
    }
    if (char === '(' || char === ')') {
      tokens.push({ type: 'paren', value: char })
      index += 1
      continue
    }
    if (char === ',') {
      tokens.push({ type: 'comma', value: char })
      index += 1
      continue
    }
    if (char === "'") {
      let value = ''
      index += 1
      while (index < input.length) {
        if (input[index] === "'" && input[index + 1] === "'") {
          value += "'"
          index += 2
          continue
        }
        if (input[index] === "'") {
          index += 1
          break
        }
        value += input[index]
        index += 1
      }
      tokens.push({ type: 'string', value })
      continue
    }
    const opMatch = input.slice(index).match(/^(>=|<=|<>|!=|=|>|<)/)
    if (opMatch) {
      const operator = requireCapturedValue(opMatch[1], 'WHERE 操作符')
      tokens.push({ type: 'operator', value: operator.toUpperCase() })
      index += operator.length
      continue
    }
    const wordMatch = input.slice(index).match(/^[A-Za-z_][\w.]*/)
    if (wordMatch) {
      tokens.push({ type: 'word', value: wordMatch[0] })
      index += wordMatch[0].length
      continue
    }
    const numberMatch = input.slice(index).match(/^-?\d+(?:\.\d+)?/)
    if (numberMatch) {
      tokens.push({ type: 'number', value: numberMatch[0] })
      index += numberMatch[0].length
      continue
    }
    throw new Error(`WHERE 子句包含无法识别的字符：${char}`)
  }

  return tokens
}

const createWhereParser = (tokens: Token[]) => {
  let cursor = 0

  const peek = () => tokens[cursor]
  const consume = () => tokens[cursor++]
  const matchWord = (value: string) =>
    peek()?.type === 'word' && peek()?.value.toUpperCase() === value
  const matchParen = (value: string) => peek()?.type === 'paren' && peek()?.value === value

  const parseExpression = (): ExpressionNode => parseOr()

  const parseOr = (): ExpressionNode => {
    let left = parseAnd()
    while (matchWord('OR')) {
      consume()
      const right = parseAnd()
      left = mergeFilter('or', left, right)
    }
    return left
  }

  const parseAnd = (): ExpressionNode => {
    let left = parsePrimary()
    while (matchWord('AND')) {
      consume()
      const right = parsePrimary()
      left = mergeFilter('and', left, right)
    }
    return left
  }

  const parsePrimary = (): ExpressionNode => {
    if (matchParen('(')) {
      consume()
      const inner = parseExpression()
      if (!matchParen(')')) {
        throw new Error('WHERE 子句括号未闭合。')
      }
      consume()
      return inner
    }
    return parseCondition()
  }

  const parseCondition = (): ConditionNode => {
    const fieldToken = consume()
    if (!fieldToken || fieldToken.type !== 'word') {
      throw new Error('WHERE 条件缺少字段名。')
    }

    const operatorToken = consume()
    if (!operatorToken) {
      throw new Error(`字段 ${fieldToken.value} 缺少操作符。`)
    }

    let operatorKey = operatorToken.value.toUpperCase()
    if (operatorToken.type === 'word' && operatorKey === 'NOT') {
      const next = consume()
      if (!next || next.type !== 'word' || !['LIKE', 'IN'].includes(next.value.toUpperCase())) {
        throw new Error(`字段 ${fieldToken.value} 的 NOT 操作符不完整。`)
      }
      operatorKey = `NOT ${next.value.toUpperCase()}`
    } else if (operatorToken.type === 'word' && operatorKey === 'IS') {
      const next = consume()
      if (!next || next.type !== 'word') {
        throw new Error(`字段 ${fieldToken.value} 的 IS 操作符不完整。`)
      }
      if (next.value.toUpperCase() === 'NOT') {
        const nullToken = consume()
        if (!nullToken || nullToken.type !== 'word' || nullToken.value.toUpperCase() !== 'NULL') {
          throw new Error(`字段 ${fieldToken.value} 的 IS NOT 操作符不完整。`)
        }
        operatorKey = 'IS NOT NULL'
      } else if (next.value.toUpperCase() === 'NULL') {
        operatorKey = 'IS NULL'
      } else {
        throw new Error(`暂不支持的 IS 条件：${next.value}`)
      }
    } else if (operatorToken.type === 'word') {
      operatorKey = operatorToken.value.toUpperCase()
    }

    const operator = SQL_TO_FETCH_OPERATOR[operatorKey]
    if (!operator) {
      throw new Error(`暂不支持的条件操作符：${operatorKey}`)
    }

    if (operator === 'null' || operator === 'not-null') {
      return { kind: 'condition', field: fieldToken.value, operator }
    }

    if (operator === 'in' || operator === 'not-in') {
      if (!matchParen('(')) {
        throw new Error(`${fieldToken.value} 的 IN 条件缺少括号。`)
      }
      consume()
      const values: string[] = []
      while (!matchParen(')')) {
        const valueToken = consume()
        if (!valueToken || !['string', 'number', 'word'].includes(valueToken.type)) {
          throw new Error(`${fieldToken.value} 的 IN 条件值无效。`)
        }
        values.push(valueToken.value)
        if (peek()?.type === 'comma') {
          consume()
        }
      }
      consume()
      return { kind: 'condition', field: fieldToken.value, operator, values }
    }

    const valueToken = consume()
    if (!valueToken || !['string', 'number', 'word'].includes(valueToken.type)) {
      throw new Error(`${fieldToken.value} 的条件值无效。`)
    }

    return {
      kind: 'condition',
      field: fieldToken.value,
      operator,
      value: valueToken.value,
    }
  }

  return {
    parseExpression,
    isDone: () => cursor >= tokens.length,
    peek,
  }
}

const mergeFilter = (
  type: 'and' | 'or',
  left: ExpressionNode,
  right: ExpressionNode,
): FilterNode => {
  const items: Array<ConditionNode | FilterNode> = []
  if (left.kind === 'filter' && left.type === type) {
    items.push(...left.items)
  } else {
    items.push(left)
  }
  if (right.kind === 'filter' && right.type === type) {
    items.push(...right.items)
  } else {
    items.push(right)
  }
  return { kind: 'filter', type, items }
}

const parseOrderByClause = (clause: string): OrderSpec[] => {
  return splitByComma(clause).map((part) => {
    const match = part.trim().match(/^([A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)?)(?:\s+(ASC|DESC))?$/i)
    if (!match) {
      throw new Error(`无法解析 ORDER BY 字段：${part.trim()}`)
    }
    return {
      field: requireCapturedValue(match[1], 'ORDER BY 字段'),
      direction: match[2]?.toLowerCase() === 'desc' ? 'desc' : 'asc',
    }
  })
}

const parseGroupByClause = (clause: string) => {
  return splitByComma(clause).map((part) => {
    const field = part.trim()
    if (!/^[A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)?$/.test(field)) {
      throw new Error(`无法解析 GROUP BY 字段：${field}`)
    }
    return field
  })
}

const validateAggregateUsage = (fields: SelectField[], groupBy: string[]) => {
  const hasAggregate = fields.some((field) => field.kind === 'aggregate')
  if (!hasAggregate && groupBy.length) {
    throw new Error('GROUP BY 仅能与聚合查询一起使用。')
  }

  if (hasAggregate) {
    const invalidColumns = fields
      .filter((field) => field.kind === 'column')
      .filter((field) => !groupBy.includes(field.expression))
    if (invalidColumns.length) {
      throw new Error('聚合查询中的普通字段必须同时出现在 GROUP BY 中。')
    }
  }
}

const buildFetchXml = (model: QueryModel) => {
  const doc = document.implementation.createDocument('', '', null)
  const fetch = doc.createElement('fetch')
  //   fetch.setAttribute('version', '1.0')
  //   fetch.setAttribute('mapping', 'logical')
  fetch.setAttribute('no-lock', 'true')
  if (model.distinct) {
    fetch.setAttribute('distinct', 'true')
  }
  if (model.top) {
    fetch.setAttribute('top', String(model.top))
  }

  const hasAggregate = [...model.fields, ...model.joins.flatMap((join) => join.fields)].some(
    (field) => field.kind === 'aggregate',
  )
  if (hasAggregate) {
    fetch.setAttribute('aggregate', 'true')
  }

  const entity = doc.createElement('entity')
  entity.setAttribute('name', model.entityName)
  if (model.entityAlias !== model.entityName) {
    entity.setAttribute('alias', model.entityAlias)
  }

  if (model.allAttributes) {
    entity.appendChild(doc.createElement('all-attributes'))
  }

  for (const field of model.fields) {
    appendFieldNode(doc, entity, field, model, model.entityAlias)
  }

  for (const join of model.joins) {
    const link = doc.createElement('link-entity')
    link.setAttribute('name', join.name)
    link.setAttribute('from', join.from)
    link.setAttribute('to', join.to)
    if (join.alias !== join.name) {
      link.setAttribute('alias', join.alias)
    }
    if (join.linkType === 'outer') {
      link.setAttribute('link-type', 'outer')
    }

    for (const field of join.fields) {
      appendFieldNode(doc, link, field, model, join.alias)
    }

    if (join.filter) {
      link.appendChild(buildFilterXml(doc, join.filter, join.alias))
    }
    entity.appendChild(link)
  }

  if (model.filter) {
    entity.appendChild(buildFilterXml(doc, model.filter, model.entityAlias))
  }

  for (const order of model.orders) {
    const orderNode = doc.createElement('order')
    const [alias, field] = splitField(order.field, model.entityAlias)
    orderNode.setAttribute('attribute', field)
    if (alias !== model.entityAlias) {
      orderNode.setAttribute('entityname', alias)
    }
    if (order.direction === 'desc') {
      orderNode.setAttribute('descending', 'true')
    }
    entity.appendChild(orderNode)
  }

  fetch.appendChild(entity)
  doc.appendChild(fetch)
  return prettyPrintXml(fetch)
}

const appendFieldNode = (
  doc: Document,
  parent: Element,
  field: SelectField,
  model: QueryModel,
  expectedAlias: string,
) => {
  const attribute = doc.createElement('attribute')

  if (field.kind === 'aggregate') {
    const aggregateMatch = field.expression.match(/^(COUNT|SUM|AVG|MIN|MAX)\((.+)\)$/i)
    if (!aggregateMatch) {
      throw new Error(`无法识别聚合字段：${field.expression}`)
    }
    const func = requireCapturedValue(aggregateMatch[1], '聚合函数')
    const rawField = requireCapturedValue(aggregateMatch[2], '聚合字段')
    const [alias, name] = splitField(rawField.trim(), model.entityAlias)
    attribute.setAttribute('name', name)
    if (alias !== expectedAlias) {
      attribute.setAttribute('entityname', alias)
    }
    attribute.setAttribute('aggregate', func.toLowerCase())
    attribute.setAttribute('alias', field.alias || `${func.toLowerCase()}_${name}`)
    parent.appendChild(attribute)
    return
  }

  const [alias, name] = splitField(field.expression, model.entityAlias)
  attribute.setAttribute('name', name)
  if (alias !== expectedAlias) {
    attribute.setAttribute('entityname', alias)
  }
  if (model.groupBy.includes(field.expression)) {
    attribute.setAttribute('groupby', 'true')
  }
  if (field.alias) {
    attribute.setAttribute('alias', field.alias)
  }
  parent.appendChild(attribute)
}

const buildFilterXml = (doc: Document, filter: FilterNode, defaultAlias: string): Element => {
  const filterNode = doc.createElement('filter')
  filterNode.setAttribute('type', filter.type)

  for (const item of filter.items) {
    if (item.kind === 'filter') {
      filterNode.appendChild(buildFilterXml(doc, item, defaultAlias))
      continue
    }

    const condition = doc.createElement('condition')
    const [alias, field] = splitField(item.field, defaultAlias)
    condition.setAttribute('attribute', field)
    if (alias !== defaultAlias) {
      condition.setAttribute('entityname', alias)
    }
    condition.setAttribute('operator', item.operator)

    if (item.operator === 'in' || item.operator === 'not-in') {
      for (const value of item.values || []) {
        const valueNode = doc.createElement('value')
        valueNode.textContent = value
        condition.appendChild(valueNode)
      }
    } else if (item.operator !== 'null' && item.operator !== 'not-null') {
      condition.setAttribute('value', item.value || '')
    }

    filterNode.appendChild(condition)
  }

  return filterNode
}

const prettyPrintXml = (root: Element) => {
  const lines: string[] = []

  const render = (node: Element, depth: number) => {
    const indent = DEFAULT_XML_INDENT.repeat(depth)
    const attrs = Array.from(node.attributes)
      .map((attr) => `${attr.name}="${escapeXml(attr.value)}"`)
      .join(' ')
    const open = attrs ? `<${node.tagName} ${attrs}>` : `<${node.tagName}>`
    const childElements = Array.from(node.children)
    const textContent = node.textContent?.trim() || ''

    if (!childElements.length && !textContent) {
      const selfClosing = attrs ? `<${node.tagName} ${attrs} />` : `<${node.tagName} />`
      lines.push(`${indent}${selfClosing}`)
      return
    }

    if (!childElements.length && textContent) {
      lines.push(`${indent}${open}${escapeXml(textContent)}</${node.tagName}>`)
      return
    }

    lines.push(`${indent}${open}`)
    for (const child of childElements) {
      render(child, depth + 1)
    }
    lines.push(`${indent}</${node.tagName}>`)
  }

  render(root, 0)
  return lines.join('\n')
}

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const requireAttribute = (node: Element, name: string, tag: string) => {
  const value = node.getAttribute(name)?.trim()
  if (!value) {
    throw new Error(`${tag} 节点缺少 ${name} 属性。`)
  }
  return value
}

const parsePositiveInteger = (value: string, label: string) => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} 必须是正整数。`)
  }
  return parsed
}

const splitField = (expression: string, fallbackAlias: string): [string, string] => {
  const parts = expression.split('.')
  if (parts.length === 1) {
    return [fallbackAlias, requireCapturedValue(parts[0], '字段名')]
  }
  if (parts.length === 2) {
    return [requireCapturedValue(parts[0], '字段别名'), requireCapturedValue(parts[1], '字段名')]
  }
  throw new Error(`暂不支持的字段引用：${expression}`)
}

const requireCapturedValue = (value: string | undefined, label: string) => {
  if (!value) {
    throw new Error(`${label} 缺失。`)
  }
  return value
}

const extractFieldAlias = (expression: string, fallbackAlias: string) => {
  const aggregateMatch = expression.match(/^(COUNT|SUM|AVG|MIN|MAX)\((.+)\)$/i)
  const target = aggregateMatch?.[2]?.trim() || expression
  const [alias] = splitField(target, fallbackAlias)
  return alias
}
