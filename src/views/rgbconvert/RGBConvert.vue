<template>
  <div class="page-wrap">
    <el-card shadow="never" class="page-card">
      <template #header>
        <div class="card-header">
          <div>
            <h3 class="page-title">RGB 与十六进制互转</h3>
            <p class="page-desc">
              支持 RGB 数值与 3 位/6 位十六进制颜色双向转换，并提供结果复制与颜色预览。
            </p>
          </div>

          <div class="toolbar">
            <el-button type="primary" @click="handleRgbToHex">RGB 转十六进制</el-button>
            <el-button type="primary" plain @click="handleHexToRgb">十六进制转 RGB</el-button>
            <el-button type="success" @click="handleCopy">复制</el-button>
            <el-button type="danger" plain @click="handleClear">清空</el-button>
          </div>
        </div>
      </template>

      <div class="content-layout">
        <section class="input-panel">
          <div class="panel-label">RGB 输入</div>

          <div class="rgb-grid">
            <el-input-number
              v-model="rgbInput.r"
              :min="0"
              :max="255"
              :step="1"
              controls-position="right"
              placeholder="R"
              class="rgb-field"
            />
            <el-input-number
              v-model="rgbInput.g"
              :min="0"
              :max="255"
              :step="1"
              controls-position="right"
              placeholder="G"
              class="rgb-field"
            />
            <el-input-number
              v-model="rgbInput.b"
              :min="0"
              :max="255"
              :step="1"
              controls-position="right"
              placeholder="B"
              class="rgb-field"
            />
          </div>

          <div class="rgb-hint">请输入 0-255 之间的整数值。</div>

          <div class="panel-label second-label">十六进制输入</div>
          <el-input v-model="hexInput" placeholder="请输入 #FA0 或 #FFAA00" maxlength="7" clearable>
            <template #prepend>#</template>
          </el-input>
          <div class="hex-hint">支持 3 位和 6 位格式，转换时会统一输出为大写 6 位格式。</div>
        </section>

        <section class="output-panel">
          <div class="panel-label">
            <span>转换结果</span>
            <el-tag size="small" type="info">只读</el-tag>
          </div>

          <el-input
            v-model="outputText"
            readonly
            placeholder="转换结果会显示在这里。"
            class="output-field"
          />

          <div class="preview-card">
            <div class="preview-meta">
              <span class="preview-title">颜色预览</span>
              <span class="preview-value">{{ previewLabel }}</span>
            </div>

            <div class="preview-box" :class="{ 'is-empty': !previewColor }" :style="previewStyle">
              <span>{{ previewColor ? '预览可用' : '等待有效颜色结果' }}</span>
            </div>
          </div>
        </section>
      </div>

      <div class="result-bar" :class="resultType">
        {{ resultMessage }}
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import 'element-plus/es/components/message/style/css'

type ResultType = 'info' | 'success' | 'warning'

type RgbChannels = {
  r: number | null
  g: number | null
  b: number | null
}

const rgbInput = reactive<RgbChannels>({
  r: null,
  g: null,
  b: null,
})
const hexInput = ref('')
const outputText = ref('')
const previewColor = ref('')
const resultType = ref<ResultType>('info')
const resultMessage = ref('请输入 RGB 或十六进制颜色值后点击上方按钮执行转换。')

const previewLabel = computed(() => previewColor.value || '暂无可展示颜色')
const previewStyle = computed(() => ({
  background: previewColor.value || 'linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%)',
}))

const setInfo = (message: string) => {
  resultType.value = 'info'
  resultMessage.value = message
}

const setSuccess = (message: string) => {
  resultType.value = 'success'
  resultMessage.value = message
}

const setWarning = (message: string) => {
  resultType.value = 'warning'
  resultMessage.value = message
}

const clearResult = (message: string) => {
  outputText.value = ''
  previewColor.value = ''
  setWarning(message)
}

const isChannelValid = (value: number | null): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 255

const normalizeHex = (value: string): string => {
  const trimmed = value.trim().replace(/^#/, '')

  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(trimmed)) {
    throw new Error('十六进制颜色格式无效，请输入 3 位或 6 位合法颜色值。')
  }

  const expanded =
    trimmed.length === 3
      ? trimmed
          .split('')
          .map((char) => char + char)
          .join('')
      : trimmed
  return `#${expanded.toUpperCase()}`
}

const formatRgb = ({ r, g, b }: { r: number; g: number; b: number }) => `RGB(${r}, ${g}, ${b})`

const convertHexToRgb = (value: string) => {
  const normalized = normalizeHex(value)
  const r = Number.parseInt(normalized.slice(1, 3), 16)
  const g = Number.parseInt(normalized.slice(3, 5), 16)
  const b = Number.parseInt(normalized.slice(5, 7), 16)

  return {
    normalized,
    rgb: { r, g, b },
  }
}

const ensureRgbInput = (): { r: number; g: number; b: number } | null => {
  if (!isChannelValid(rgbInput.r) || !isChannelValid(rgbInput.g) || !isChannelValid(rgbInput.b)) {
    clearResult('RGB 输入无效，请确保 R、G、B 都是 0-255 之间的整数。')
    return null
  }

  return {
    r: rgbInput.r,
    g: rgbInput.g,
    b: rgbInput.b,
  }
}

const handleRgbToHex = () => {
  const rgb = ensureRgbInput()
  if (!rgb) {
    return
  }

  const hex = `#${[rgb.r, rgb.g, rgb.b]
    .map((channel) => channel.toString(16).padStart(2, '0').toUpperCase())
    .join('')}`

  outputText.value = hex
  previewColor.value = hex
  hexInput.value = hex
  setSuccess(`转换成功：${formatRgb(rgb)} -> ${hex}`)
}

const handleHexToRgb = () => {
  try {
    const { normalized, rgb } = convertHexToRgb(hexInput.value)
    rgbInput.r = rgb.r
    rgbInput.g = rgb.g
    rgbInput.b = rgb.b
    outputText.value = formatRgb(rgb)
    previewColor.value = normalized
    hexInput.value = normalized
    setSuccess(`转换成功：${normalized} -> ${formatRgb(rgb)}`)
  } catch (error) {
    clearResult(error instanceof Error ? error.message : '十六进制转换失败，请检查输入内容。')
  }
}

const handleCopy = async () => {
  if (!outputText.value.trim()) {
    setWarning('当前没有可复制的转换结果。')
    ElMessage.warning('当前没有可复制的转换结果。')
    return
  }

  try {
    await navigator.clipboard.writeText(outputText.value)
    setSuccess('转换结果已复制。')
    ElMessage.success('转换结果已复制。')
  } catch {
    setWarning('复制失败，请手动复制。')
    ElMessage.error('复制失败，请手动复制。')
  }
}

const handleClear = () => {
  rgbInput.r = null
  rgbInput.g = null
  rgbInput.b = null
  hexInput.value = ''
  outputText.value = ''
  previewColor.value = ''
  setInfo('已清空输入、结果与颜色预览。')
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
  flex-wrap: wrap;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.page-desc {
  margin: 6px 0 0;
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.content-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 16px;
}

.input-panel,
.output-panel {
  min-width: 0;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  padding: 16px;
  background: #ffffff;
}

.panel-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #606266;
}

.second-label {
  margin-top: 20px;
}

.rgb-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.rgb-field,
.output-field {
  width: 100%;
}

.rgb-hint,
.hex-hint {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: #909399;
}

.preview-card {
  margin-top: 16px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid #ebeef5;
  background: #fafafa;
}

.preview-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.preview-title {
  font-size: 13px;
  color: #606266;
}

.preview-value {
  font-size: 12px;
  color: #909399;
}

.preview-box {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.4px;
}

.preview-box.is-empty {
  color: #909399;
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
  .content-layout {
    grid-template-columns: 1fr;
  }

  .rgb-grid {
    grid-template-columns: 1fr;
  }

  .preview-meta {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
