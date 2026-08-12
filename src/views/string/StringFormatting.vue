<template>
  <div class="page-wrap">
    <el-card shadow="never" class="page-card">
      <template #header>
        <div class="card-header">
          <div>
            <h3 class="page-title">字符串处理</h3>
            <!-- <p class="page-desc">支持大小写转换、标题化与字符统计等常用操作</p> -->
          </div>
        </div>
      </template>

      <div class="toolbar">
        <el-button type="primary" @click="handleToLower">大写转小写</el-button>
        <el-button type="primary" plain @click="handleToUpper">小写转大写</el-button>
        <el-button @click="handleToTitleCase">首字符大写</el-button>
        <el-button @click="handleCountAll">字数统计</el-button>
        <el-button @click="handleCountNonWhitespace">字数统计(不包含字符)</el-button>
        <el-button type="success" @click="handleCopy">复制结果</el-button>
        <el-button type="danger" plain @click="handleClear">清空</el-button>
      </div>

      <div class="editor-layout">
        <section class="panel">
          <div class="panel-label">输入区</div>
          <el-input
            v-model="inputText"
            type="textarea"
            :rows="14"
            resize="none"
            placeholder="请输入要处理的文本。"
            class="text-editor"
          />
        </section>

        <section class="panel">
          <div class="panel-label">
            <span>输出区</span>
            <el-tag size="small" type="info">只读</el-tag>
          </div>
          <el-input
            v-model="outputText"
            type="textarea"
            :rows="14"
            resize="none"
            readonly
            placeholder="处理结果会显示在这里。"
            class="text-editor output-editor"
          />
        </section>
      </div>

      <div class="result-bar" :class="resultType">
        {{ resultMessage }}
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import 'element-plus/es/components/message/style/css'

type ResultType = 'info' | 'success' | 'warning'

const inputText = ref('')
const outputText = ref('')
const resultType = ref<ResultType>('info')
const resultMessage = ref('请输入字符串后选择上方功能按钮。')

const ensureInput = (): boolean => {
  if (inputText.value.length > 0) {
    return true
  }

  resultType.value = 'warning'
  resultMessage.value = '输入区为空，请先输入内容。'
  return false
}

const updateSuccess = (message: string) => {
  resultType.value = 'success'
  resultMessage.value = message
}

const updateInfo = (message: string) => {
  resultType.value = 'info'
  resultMessage.value = message
}

const toTitleCase = (text: string): string =>
  text.replace(/\S+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())

const handleToLower = () => {
  if (!ensureInput()) return
  outputText.value = inputText.value.toLowerCase()
  updateSuccess('已完成大写转小写。')
}

const handleToUpper = () => {
  if (!ensureInput()) return
  outputText.value = inputText.value.toUpperCase()
  updateSuccess('已完成小写转大写。')
}

const handleToTitleCase = () => {
  if (!ensureInput()) return
  outputText.value = toTitleCase(inputText.value)
  updateSuccess('已完成首字符大写（Title Case）。')
}

const handleCountAll = () => {
  if (!ensureInput()) return
  const count = inputText.value.length
  updateInfo(`字数统计结果：共 ${count} 个字符。`)
}

const handleCountNonWhitespace = () => {
  if (!ensureInput()) return
  const count = inputText.value.replace(/\s/g, '').length
  updateInfo(`字数统计(不包含字符)结果：共 ${count} 个非空白字符。`)
}

const handleCopy = async () => {
  if (!outputText.value.trim()) {
    resultType.value = 'warning'
    resultMessage.value = '当前没有可复制的输出内容。'
    ElMessage.warning('当前没有可复制的输出内容。')
    return
  }

  try {
    await navigator.clipboard.writeText(outputText.value)
    updateSuccess('输出内容已复制。')
    ElMessage.success('输出内容已复制。')
  } catch {
    resultType.value = 'warning'
    resultMessage.value = '复制失败，请手动复制。'
    ElMessage.error('复制失败，请手动复制。')
  }
}

const handleClear = () => {
  inputText.value = ''
  outputText.value = ''
  resultType.value = 'info'
  resultMessage.value = '已清空输入和输出内容。'
}
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
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.editor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
}

.panel {
  min-width: 0;
}

.panel-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: #606266;
}

.text-editor :deep(.el-textarea__inner) {
  min-height: 420px;
  border-radius: 8px;
  font-family: Consolas, 'Courier New', monospace;
  line-height: 1.6;
}

.output-editor :deep(.el-textarea__inner) {
  background: #fafafa;
}

.result-bar {
  margin-top: 16px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  border: 1px solid #e4e7ed;
  color: #606266;
  background: #f5f7fa;
}

.result-bar.success {
  color: #0f5132;
  border-color: #badbcc;
  background: #d1e7dd;
}

.result-bar.warning {
  color: #664d03;
  border-color: #ffecb5;
  background: #fff3cd;
}

@media (max-width: 960px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }
}
</style>
