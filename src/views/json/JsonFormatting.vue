<template>
  <div class="page-wrap">
    <el-card shadow="never" class="page-card">
      <template #header>
        <div class="card-header">
          <div>
            <!-- <h3 class="page-title">Json相关 / 功能1</h3> -->
            <!-- <p class="page-desc">JSON 校验、格式化、压缩、转义、Unicode 互转等常用工具</p> -->

            <!-- 功能按钮栏 -->
            <div class="toolbar">
              <el-button type="success" @click="formatJson">校验/格式化</el-button>
              <el-button @click="compressJson">压缩</el-button>
              <el-button @click="escapeJson">转义</el-button>
              <el-button @click="unescapeJson">去转义</el-button>
              <el-button @click="unicodeToZh">Unicode转中文</el-button>
              <el-button @click="zhToUnicode">中文转Unicode</el-button>
              <el-button type="primary" @click="copyResult">
                <el-icon><Document /></el-icon>
                <span>复制结果</span>
              </el-button>
              <el-button type="danger" @click="clearAll">
                <el-icon><Delete /></el-icon>
                <span>清空</span>
              </el-button>
              <el-button @click="saveLocal">
                <el-icon><Download /></el-icon>
                <span>保存本地</span>
              </el-button>
            </div>
          </div>
        </div>
      </template>

      <!-- 编辑器区域：CodeMirror + 底部拖拽条 -->
      <div class="editor-section">
        <Codemirror
          v-model="code"
          :extensions="extensions"
          :style="{ height: editorHeight + 'px' }"
          class="code-editor"
        />
        <!-- 底部拖拽条：左提示 + 中手柄 + 右提示 -->
        <div class="drag-bar" :class="{ 'is-dragging': isDragging }" @mousedown="startDrag">
          <span class="drag-tip">① 鼠标左键按下拖动，调整大小 ▶▷</span>
          <span class="drag-handle">═</span>
          <span class="drag-tip">下次打开本工具，大小是记忆的 ◁←</span>
        </div>
      </div>

      <!-- 校验结果提示条 -->
      <div class="result-bar" :class="resultType">
        {{ resultMessage }}
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { Codemirror } from 'vue-codemirror'
import { json } from '@codemirror/lang-json'

/* 编辑器内容（双向绑定） */
const code = ref('')

/* 校验结果提示：type 控制 success/error/info 三种状态颜色 */
const resultType = ref<'info' | 'success' | 'error'>('info')
const resultMessage = ref('请输入 JSON 内容后点击【校验/格式化】')

/* CodeMirror 扩展配置：仅启用 JSON 语法高亮，背景使用白色 */
const extensions = [json()]

/* 编辑器高度：可拖拽调整，并通过 localStorage 记忆 */
const STORAGE_KEY = 'lrctools:json-func1:editor-height'
const editorHeight = ref(400)
const isDragging = ref(false)

onMounted(() => {
  /* 读取上次保存的编辑器高度 */
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    const h = Number(saved)
    if (!Number.isNaN(h) && h >= 200 && h <= 1000) {
      editorHeight.value = h
    }
  }
})

/* 拖拽调整编辑器高度：按下底部手柄后监听全局 mousemove/mouseup */
const startDrag = (e: MouseEvent) => {
  e.preventDefault()
  isDragging.value = true
  const startY = e.clientY
  const startHeight = editorHeight.value

  const onMove = (ev: MouseEvent) => {
    const delta = ev.clientY - startY
    /* 限制最小 200px、最大 1000px */
    const next = Math.min(1000, Math.max(200, startHeight + delta))
    editorHeight.value = next
  }
  const onUp = () => {
    isDragging.value = false
    /* 释放时持久化高度 */
    localStorage.setItem(STORAGE_KEY, String(editorHeight.value))
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

/* 1. 校验并格式化：解析成功则以 2 空格缩进重新输出 */
const formatJson = () => {
  if (!code.value.trim()) {
    resultType.value = 'info'
    resultMessage.value = '请输入 JSON 内容后点击【校验/格式化】'
    return
  }
  try {
    const obj = JSON.parse(code.value)
    code.value = JSON.stringify(obj, null, 2)
    resultType.value = 'success'
    resultMessage.value = '老铁，这个JSON格式，没毛病。'
  } catch (err: any) {
    resultType.value = 'error'
    resultMessage.value = `JSON 格式有误：${err.message}`
  }
}

/* 2. 压缩：去除换行与多余空格，输出单行 JSON */
const compressJson = () => {
  if (!code.value.trim()) return
  try {
    const obj = JSON.parse(code.value)
    code.value = JSON.stringify(obj)
    resultType.value = 'success'
    resultMessage.value = '已压缩为单行 JSON。'
  } catch (err: any) {
    resultType.value = 'error'
    resultMessage.value = `JSON 格式有误：${err.message}`
  }
}

/* 3. 转义：对反斜杠、双引号、换行等特殊字符添加反斜杠 */
const escapeJson = () => {
  if (!code.value) return
  code.value = code.value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
  resultType.value = 'info'
  resultMessage.value = '已完成转义处理。'
}

/* 4. 去转义：移除反斜杠转义，还原原始字符 */
const unescapeJson = () => {
  if (!code.value) return
  code.value = code.value
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\')
  resultType.value = 'info'
  resultMessage.value = '已完成去转义处理。'
}

/* 5. Unicode 转中文：将 \uXXXX 序列还原为对应字符 */
const unicodeToZh = () => {
  if (!code.value) return
  code.value = code.value.replace(/\\u([0-9a-fA-F]{4})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16)),
  )
  resultType.value = 'info'
  resultMessage.value = '已将 Unicode 转换为中文。'
}

/* 6. 中文转 Unicode：将中文字符编码为 \uXXXX 形式 */
const zhToUnicode = () => {
  if (!code.value) return
  code.value = code.value.replace(/[\u4e00-\u9fa5]/g, (ch) => {
    const hex = ch.charCodeAt(0).toString(16).padStart(4, '0')
    return `\\u${hex}`
  })
  resultType.value = 'info'
  resultMessage.value = '已将中文转换为 Unicode。'
}

/* 7. 复制结果：写入剪贴板并提示 */
const copyResult = async () => {
  if (!code.value) {
    ElMessage.warning('编辑器内容为空')
    return
  }
  try {
    await navigator.clipboard.writeText(code.value)
    ElMessage.success('复制成功')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

/* 8. 清空：重置编辑器与校验状态 */
const clearAll = () => {
  code.value = ''
  resultType.value = 'info'
  resultMessage.value = '请输入 JSON 内容后点击【校验/格式化】'
}

/* 9. 保存本地：以 result.json 文件名下载 */
const saveLocal = () => {
  if (!code.value) {
    ElMessage.warning('编辑器内容为空')
    return
  }
  const blob = new Blob([code.value], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'result.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  ElMessage.success('已保存为 result.json')
}

onBeforeUnmount(() => {
  /* 组件卸载时持久化当前高度，确保下次打开可恢复 */
  localStorage.setItem(STORAGE_KEY, String(editorHeight.value))
})
</script>

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

/* 编辑器区域容器 */
.editor-section {
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  overflow: hidden;
}

/* CodeMirror 编辑器主体 */
.code-editor {
  font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
  font-size: 13px;
}

/* 强制 CodeMirror 背景为白色（覆盖默认主题） */
.code-editor :deep(.cm-editor),
.code-editor :deep(.cm-scroller),
.code-editor :deep(.cm-gutters) {
  background-color: #ffffff !important;
}

/* 编辑器内文字颜色保持深色，保证白底可读 */
.code-editor :deep(.cm-content) {
  color: #303133;
}

/* 行号栏背景同步设为浅灰，与白色主体区分 */
.code-editor :deep(.cm-gutterElement) {
  color: #909399;
}

/* 底部拖拽条：左右提示 + 中间手柄 */
.drag-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background-color: #f5f7fa;
  border-top: 1px solid #e4e7ed;
  cursor: ns-resize;
  user-select: none;
  font-size: 12px;
  color: #909399;
  transition: background-color 0.2s;
}

.drag-bar:hover,
.drag-bar.is-dragging {
  background-color: #ecf5ff;
}

/* 中间拖拽手柄：三横线视觉 */
.drag-handle {
  font-size: 14px;
  color: #5b9bf5;
  letter-spacing: 2px;
}

.drag-tip {
  flex: 1;
}

.drag-tip:last-child {
  text-align: right;
}

/* 功能按钮栏 */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  /* margin-top: 16px; */
}

/* 校验结果提示条 */
.result-bar {
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.5;
}

.result-bar.success {
  background-color: #e7f5d2;
  color: #67c23a;
}

.result-bar.error {
  background-color: #fde2e2;
  color: #f56c6c;
}

.result-bar.info {
  background-color: #f5f7fa;
  color: #909399;
}
</style>
