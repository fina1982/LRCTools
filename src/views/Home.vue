<script setup lang="ts">
import { useRouter } from 'vue-router'
import { menuConfig } from '@/config/menu'
import { ArrowRight } from '@element-plus/icons-vue'

const router = useRouter()

const goFirst = (index: number) => {
  const first = menuConfig[index]?.children?.[0]
  if (!first) return
  if (first.name) router.push({ name: first.name })
  else router.push(first.path)
}

const cards = [
  { title: 'Json相关', desc: 'JSON 格式化、压缩、校验、转换等工具', accent: '#5B9BF5' },
  { title: 'FetchXml转换', desc: 'FetchXml 与其他格式互转工具', accent: '#409EFF' },
  { title: '字符串相关', desc: '字符串编码、加密、替换、统计等工具', accent: '#67B3F5' },
  { title: '谁是卧底', desc: '适合聚会的本地传手机玩法，移动端优先', accent: '#f08a5d' },
]
</script>

<template>
  <div class="home-wrap">
    <div class="hero">
      <h1 class="hero-title">欢迎使用 LRCTools</h1>
      <p class="hero-sub">个人工具栏 · 轻量高效</p>
    </div>
    <el-row :gutter="20" class="card-row">
      <el-col v-for="(c, i) in cards" :key="c.title" :xs="24" :sm="12" :md="6">
        <el-card class="tool-card" shadow="hover" @click="goFirst(i)">
          <template #header>
            <div class="card-header">
              <span class="card-accent" :style="{ backgroundColor: c.accent }"></span>
              <span class="card-title">{{ c.title }}</span>
            </div>
          </template>
          <p class="card-desc">{{ c.desc }}</p>
          <div class="card-footer">
            <span>开始使用</span>
            <el-icon><ArrowRight /></el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.home-wrap {
  padding: 16px 0;
}

.hero {
  text-align: center;
  margin-bottom: 36px;
}

.hero-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px;
  background: linear-gradient(135deg, #5b9bf5 0%, #409eff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-sub {
  color: #909399;
  font-size: 14px;
  margin: 0;
}

.card-row {
  max-width: 1100px;
  margin: 0 auto;
}

.tool-card {
  cursor: pointer;
  border-radius: 10px;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  height: 180px;
  display: flex;
  flex-direction: column;
}

.tool-card:hover {
  transform: translateY(-4px);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-accent {
  width: 4px;
  height: 18px;
  border-radius: 2px;
}

.card-title {
  font-weight: 600;
  font-size: 16px;
}

.card-desc {
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
  margin: 0 0 16px;
  flex: 1;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  color: #5b9bf5;
  font-size: 13px;
  font-weight: 500;
}
</style>
