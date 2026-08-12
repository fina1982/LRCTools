<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowDown as ArrowDownIcon, Tools as ToolsIcon } from '@element-plus/icons-vue'
import { menuConfig } from '@/config/menu'

const route = useRoute()
const router = useRouter()

const activeMenu = computed(() => route.path)

const getFirstChildPath = (item: (typeof menuConfig)[number]) => {
  const first = item.children?.[0]
  if (!first) return item.path
  return first.name ? { name: first.name } : first.path
}

const goHome = () => {
  const base = import.meta.env.BASE_URL || '/'
  window.location.href = `${window.location.origin}${base}#/`
}

const handleTitleClick = (item: (typeof menuConfig)[number]) => {
  router.push(getFirstChildPath(item))
}
</script>

<template>
  <header class="app-header">
    <div class="header-inner">
      <div class="logo" @click="goHome">
        <el-icon :size="24" color="#5B9BF5">
          <ToolsIcon />
        </el-icon>
        <span class="logo-text">LRCTools</span>
      </div>
      <nav class="app-menu">
        <ul class="menu-list">
          <li
            v-for="item in menuConfig"
            :key="item.path"
            class="menu-item"
            :class="{ 'is-active': activeMenu.startsWith(item.path) }"
          >
            <el-dropdown
              trigger="hover"
              :hide-on-click="true"
              @command="(cmd: string) => router.push({ name: cmd })"
            >
              <span class="menu-title" @click="handleTitleClick(item)">
                {{ item.label }}
                <el-icon class="arrow-icon">
                  <ArrowDownIcon />
                </el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="sub in item.children"
                    :key="sub.path"
                    :command="sub.name"
                    :class="{ 'is-active': activeMenu === sub.path }"
                  >
                    {{ sub.label }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </li>
        </ul>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: var(--app-header-height);
  background-color: #ffffff;
  border-bottom: 1px solid #ebeef5;
  box-shadow: 0 1px 4px rgba(91, 155, 245, 0.08);
}

.header-inner {
  height: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 40px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #5b9bf5 0%, #409eff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 0.5px;
}

.app-menu {
  flex: 1;
  height: 100%;
}

.menu-list {
  height: 100%;
  display: flex;
  align-items: stretch;
  list-style: none;
  padding: 0;
  margin: 0;
  gap: 4px;
}

.menu-item {
  height: 100%;
  display: flex;
  align-items: center;
  position: relative;
}

.menu-title {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 100%;
  padding: 0 16px;
  font-size: 15px;
  color: #303133;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
  user-select: none;
  /* 移除 hover/focus 时的默认边框和轮廓 */
  outline: none;
  border: none;
  box-shadow: none;
}

/* 移除鼠标悬停时 Element Plus 下拉菜单触发器的黑边框 */
.menu-title:hover,
.menu-title:focus,
.menu-title:focus-visible {
  outline: none;
  border: none;
  box-shadow: none;
}

/* 移除 el-dropdown 触发器的默认 outline */
.menu-item :deep(.el-tooltip__trigger),
.menu-item :deep(.el-dropdown-selfdefine) {
  outline: none !important;
  border: none !important;
}

.menu-item :deep(.el-tooltip__trigger:hover),
.menu-item :deep(.el-tooltip__trigger:focus),
.menu-item :deep(.el-dropdown-selfdefine:hover),
.menu-item :deep(.el-dropdown-selfdefine:focus) {
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
}

.menu-title:hover {
  color: #5b9bf5;
}

.arrow-icon {
  font-size: 12px;
  transition: transform 0.2s;
}

.menu-item:hover .arrow-icon {
  transform: rotate(180deg);
}

.menu-item.is-active .menu-title {
  color: #5b9bf5;
  font-weight: 500;
}

.menu-item.is-active .menu-title::after {
  content: '';
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 0;
  height: 2px;
  background: linear-gradient(90deg, #5b9bf5 0%, #409eff 100%);
  border-radius: 2px;
}

@media (max-width: 768px) {
  .app-header {
    height: auto;
  }

  .header-inner {
    min-height: var(--app-header-height);
    padding: 10px 16px 12px;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .logo {
    justify-content: center;
  }

  .app-menu {
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .app-menu::-webkit-scrollbar {
    display: none;
  }

  .menu-list {
    min-width: max-content;
    gap: 0;
  }

  .menu-item {
    height: auto;
  }

  .menu-title {
    height: 40px;
    padding: 0 12px;
    font-size: 14px;
    white-space: nowrap;
  }

  .menu-item.is-active .menu-title::after {
    left: 12px;
    right: 12px;
  }
}
</style>

<style>
.el-dropdown-menu__item.is-active {
  color: #5b9bf5;
  background-color: #f0f5fe;
  font-weight: 500;
}
</style>
