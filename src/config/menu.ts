export interface SubMenuItem {
  label: string
  path: string
  name?: string
}

export interface MenuItem {
  label: string
  path: string
  icon?: string
  children: SubMenuItem[]
}

export const menuConfig: MenuItem[] = [
  {
    label: 'Json相关',
    path: '/json',
    children: [
      { label: 'JSON格式化', path: '/json/jsonformatting', name: 'JsonFormatting' },
      { label: '大小写转换', path: '/string/stringformatting', name: 'stringformatting' },
      { label: 'RGB 与十六进制互转', path: '/rgbconvert/rgbconvert', name: 'RGBConvert' },
    ],
  },
  {
    label: 'FetchXml转换',
    path: '/fetchxml',
    children: [{ label: 'FetchXml转换SQL', path: '/fetchxml/fetchtosql', name: 'FetchToSql' }],
  },
  {
    label: '谁是卧底',
    path: '/undercover',
    children: [{ label: '开始游戏', path: '/undercover/game', name: 'UnderCoverGame' }],
  },
  // {
  //   label: '二维码相关',
  //   path: '/qrcode',
  //   children: [{ label: '二维码生成', path: '/qrcode/func1' }],
  // },
]
