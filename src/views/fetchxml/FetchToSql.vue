<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Codemirror } from 'vue-codemirror'
import {
  CopyDocument as CopyDocumentIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Switch as SwitchIcon,
} from '@element-plus/icons-vue'
import { convertContent, type ConvertDirection, type ConvertResult } from './fetchXmlSqlConverter'

type ResultType = 'info' | 'success' | 'error'

const direction = ref<ConvertDirection>('fetchxml-to-sql')
const inputText = ref('')
const outputText = ref('')
const resultType = ref<ResultType>('info')
const resultMessage = ref('请选择转换方向并输入内容后点击“转换”。')
const editorExtensions: [] = []

const isFetchToSql = computed(() => direction.value === 'fetchxml-to-sql')
const inputTitle = computed(() => (isFetchToSql.value ? 'FetchXml 输入' : 'SQL 输入'))
const outputTitle = computed(() => (isFetchToSql.value ? 'SQL 输出' : 'FetchXml 输出'))
const convertButtonText = computed(() => (isFetchToSql.value ? '转换为 SQL' : '转换为 FetchXml'))
const directionText = computed(() => (isFetchToSql.value ? 'FetchXml -> SQL' : 'SQL -> FetchXml'))
const inputPlaceholder = computed(() =>
  isFetchToSql.value
    ? '请输入 FetchXml，例如包含 entity、attribute、filter、link-entity 的查询。'
    : '请输入 SQL，仅支持受控范围内的 SELECT 查询。',
)
const outputPlaceholder = computed(() =>
  isFetchToSql.value ? '转换后的 SQL 会显示在这里。' : '转换后的 FetchXml 会显示在这里。',
)

const resetMessage = () => {
  resultType.value = 'info'
  resultMessage.value = isFetchToSql.value
    ? '当前模式：FetchXml -> SQL。支持字段、条件、排序、JOIN、有限聚合。'
    : '当前模式：SQL -> FetchXml。仅支持受控范围内的 SELECT 查询。'
}

const applyResult = (result: ConvertResult) => {
  outputText.value = result.output
  resultType.value = result.status
  resultMessage.value = result.message
}

const handleConvert = () => {
  try {
    const result = convertContent(inputText.value, direction.value)
    applyResult(result)
  } catch (error) {
    outputText.value = ''
    resultType.value = 'error'
    resultMessage.value = error instanceof Error ? error.message : '转换失败，请检查输入内容。'
  }
}

const handleCopy = async () => {
  if (!outputText.value.trim()) {
    ElMessage.warning('当前没有可复制的输出内容。')
    return
  }

  try {
    await navigator.clipboard.writeText(outputText.value)
    ElMessage.success('输出内容已复制。')
  } catch {
    ElMessage.error('复制失败，请手动复制。')
  }
}

const handleClear = () => {
  inputText.value = ''
  outputText.value = ''
  resetMessage()
}

const toggleDirection = () => {
  direction.value = isFetchToSql.value ? 'sql-to-fetchxml' : 'fetchxml-to-sql'
  outputText.value = ''
  resetMessage()
}

resetMessage()
</script>

<template>
  <div class="page-wrap">
    <el-card shadow="never" class="page-card">
      <template #header>
        <div class="card-header">
          <div>
            <h3 class="page-title">FetchXml 与 SQL 互转</h3>
            <!-- <p class="page-desc">
              双向转换工具，支持受控范围内的查询结构，并对不支持语法明确报错。
            </p> -->

            <div class="direction-bar">
              <el-tag effect="plain" type="primary">{{ directionText }}</el-tag>
              <span class="direction-tip">中间按钮用于切换当前转换方向。</span>
            </div>
          </div>
          <div class="toolbar">
            <el-button type="primary" @click="handleConvert">
              <el-icon><RefreshIcon /></el-icon>
              <span>{{ convertButtonText }}</span>
            </el-button>
            <el-button @click="handleCopy">
              <el-icon><CopyDocumentIcon /></el-icon>
              <span>复制</span>
            </el-button>
            <el-button type="danger" plain @click="handleClear">
              <el-icon><DeleteIcon /></el-icon>
              <span>清空</span>
            </el-button>
          </div>
        </div>
      </template>

      <div class="editor-layout">
        <section class="panel">
          <div class="panel-label">{{ inputTitle }}</div>
          <div class="editor-shell">
            <Codemirror
              v-model="inputText"
              :extensions="editorExtensions"
              :style="{ height: '350px' }"
              :placeholder="inputPlaceholder"
              class="code-editor"
            />
          </div>
        </section>

        <div class="switcher-wrap">
          <el-button circle type="primary" class="switcher-button" @click="toggleDirection">
            <el-icon><SwitchIcon /></el-icon>
          </el-button>
          <span class="switcher-text">切换方向</span>
        </div>

        <section class="panel">
          <div class="panel-label">
            <span>{{ outputTitle }}</span>
            <el-tag size="small" type="info">只读</el-tag>
          </div>
          <div class="editor-shell is-readonly">
            <Codemirror
              v-model="outputText"
              :extensions="editorExtensions"
              :style="{ height: '350px' }"
              :disabled="true"
              :placeholder="outputPlaceholder"
              class="code-editor"
            />
          </div>
        </section>
      </div>

      <div class="result-bar" :class="resultType">
        {{ resultMessage }}
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.page-wrap {
  width: 100%;
}

.page-card {
  border-radius: 10px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.page-desc {
  margin: 4px 0 0;
  font-size: 13px;
  color: #909399;
}

.toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.direction-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
  margin-bottom: 5px;
  color: #606266;
  font-size: 13px;
}

.direction-tip {
  color: #909399;
}

.editor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 84px minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.panel-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #606266;
  font-weight: 500;
}

.editor-shell {
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
  background-color: #ffffff;
}

.editor-shell.is-readonly {
  background-color: #fafafa;
}

.code-editor {
  font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
  font-size: 13px;
}

.code-editor :deep(.cm-editor),
.code-editor :deep(.cm-scroller),
.code-editor :deep(.cm-gutters) {
  background-color: transparent !important;
}

.code-editor :deep(.cm-content),
.code-editor :deep(.cm-line) {
  color: #303133;
}

.code-editor :deep(.cm-placeholder) {
  color: #a8abb2;
}

.code-editor :deep(.cm-gutterElement) {
  color: #909399;
}

.code-editor :deep(.cm-focused) {
  outline: none;
}

.switcher-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.switcher-button {
  width: 44px;
  height: 44px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.switcher-button .el-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.switcher-button .el-icon svg {
  width: 20px;
  height: 20px;
}

/* Ensure any intermediate span wrapper also fills and centers the icon */
.switcher-button > span {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 0;
}

.switcher-text {
  font-size: 12px;
  color: #909399;
}

.result-bar {
  margin-top: 16px;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.5;
}

.result-bar.info {
  background-color: #f4f4f5;
  color: #606266;
}

.result-bar.success {
  background-color: #e7f5d2;
  color: #67c23a;
}

.result-bar.error {
  background-color: #fde2e2;
  color: #f56c6c;
}

@media (max-width: 960px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }

  .switcher-wrap {
    flex-direction: row;
  }
}
</style>
