import { createRouter, createWebHashHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import JsonFormatting from '@/views/json/JsonFormatting.vue'
import FetchToSql from '@/views/fetchxml/FetchToSql.vue'
import StringFormatting from '@/views/string/StringFormatting.vue'
import QrcodeFunc1 from '@/views/qrcode/Func1.vue'
import RGBConvert from '@/views/rgbconvert/RGBConvert.vue'
import HomePlaceholder from '@/views/Home.vue'
import UnderCoverGame from '@/views/UnderCoverGame/UnderCoverGame.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainLayout,
      redirect: { name: 'JsonFormatting' },
      children: [
        {
          path: '',
          name: 'Home',
          component: HomePlaceholder,
        },
        {
          path: 'json',
          redirect: { name: 'JsonFormatting' },
          children: [
            {
              path: 'jsonformatting',
              name: 'JsonFormatting',
              component: JsonFormatting,
              meta: { title: 'Json相关 - JSON格式化' },
            },
          ],
        },
        {
          path: 'fetchxml',
          redirect: { name: 'FetchToSql' },
          children: [
            {
              path: 'fetchtosql',
              name: 'FetchToSql',
              component: FetchToSql,
              meta: { title: 'FetchXml转换 - FetchXml转换SQL' },
            },
          ],
        },
        {
          path: 'string',
          redirect: { name: 'stringformatting' },
          children: [
            {
              path: 'stringformatting',
              name: 'stringformatting',
              component: StringFormatting,
              meta: { title: '字符串相关 - 大小写转换' },
            },
          ],
        },
        {
          path: 'rgbconvert',
          redirect: { name: 'RGBConvert' },
          children: [
            {
              path: 'rgbconvert',
              name: 'RGBConvert',
              component: RGBConvert,
              meta: { title: 'RGB 与十六进制互转' },
            },
          ],
        },
        {
          path: 'qrcode',
          redirect: { name: 'QrcodeFunc1' },
          children: [
            {
              path: 'func1',
              name: 'QrcodeFunc1',
              component: QrcodeFunc1,
              meta: { title: '二维码相关 - 二维码生成' },
            },
          ],
        },
        {
          path: 'undercover',
          redirect: { name: 'UnderCoverGame' },
          children: [
            {
              path: 'game',
              name: 'UnderCoverGame',
              component: UnderCoverGame,
              meta: { title: '谁是卧底 - 开始游戏', hideAppHeader: true },
            },
          ],
        },
      ],
    },
  ],
})

export default router
