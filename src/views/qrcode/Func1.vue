<script setup lang="ts">
import { reactive } from 'vue'

const form = reactive({
  content: '',
  size: 256,
  level: 'M',
  color: '#000000',
  bg: '#ffffff',
})
</script>

<template>
  <div class="page-wrap">
    <el-card shadow="never" class="page-card">
      <template #header>
        <div class="card-header">
          <div>
            <h3 class="page-title">二维码相关 / 功能1</h3>
            <p class="page-desc">表单 + 预览布局：左侧参数、右侧生成预览</p>
          </div>
          <div class="toolbar">
            <el-button type="primary">
              <el-icon><Refresh /></el-icon>
              <span>生成</span>
            </el-button>
          </div>
        </div>
      </template>

      <el-row :gutter="24">
        <el-col :xs="24" :md="12">
          <el-form :model="form" label-width="90px" class="form">
            <el-form-item label="文本内容">
              <el-input
                v-model="form.content"
                type="textarea"
                :rows="5"
                placeholder="输入需要生成二维码的内容..."
              />
            </el-form-item>
            <el-form-item label="尺寸">
              <el-input-number v-model="form.size" :min="128" :max="1024" :step="32" />
              <span class="unit">px</span>
            </el-form-item>
            <el-form-item label="容错等级">
              <el-radio-group v-model="form.level">
                <el-radio value="L">L (7%)</el-radio>
                <el-radio value="M">M (15%)</el-radio>
                <el-radio value="Q">Q (25%)</el-radio>
                <el-radio value="H">H (30%)</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="前景色">
              <el-color-picker v-model="form.color" />
            </el-form-item>
            <el-form-item label="背景色">
              <el-color-picker v-model="form.bg" />
            </el-form-item>
          </el-form>
        </el-col>
        <el-col :xs="24" :md="12">
          <div class="preview-panel">
            <div class="panel-label">
              <span>预览</span>
              <el-tag size="small" type="success">占位</el-tag>
            </div>
            <div class="preview-box">
              <el-empty description="暂无预览 - 点击生成后显示二维码">
                <template #image>
                  <el-icon :size="80" color="#C0C4CC">
                    <Picture />
                  </el-icon>
                </template>
              </el-empty>
            </div>
            <div class="preview-info">
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="尺寸"
                  >{{ form.size }} × {{ form.size }} px</el-descriptions-item
                >
                <el-descriptions-item label="容错等级">{{ form.level }}</el-descriptions-item>
                <el-descriptions-item label="前景色">{{ form.color }}</el-descriptions-item>
                <el-descriptions-item label="背景色">{{ form.bg }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </div>
        </el-col>
      </el-row>
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

.form {
  padding: 4px 0;
}

.unit {
  margin-left: 8px;
  color: #909399;
  font-size: 13px;
}

.preview-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #606266;
  font-weight: 500;
}

.preview-box {
  width: 100%;
  aspect-ratio: 1 / 1;
  max-width: 340px;
  margin: 0 auto;
  background: #ffffff;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-info {
  max-width: 340px;
  margin: 0 auto;
  width: 100%;
}
</style>
