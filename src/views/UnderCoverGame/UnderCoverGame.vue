<template>
  <div class="uc-page">
    <div class="uc-shell">
      <header class="uc-topbar">
        <div class="uc-topbar-copy">
          <el-button plain class="back-button" @click="goHome">回到首页</el-button>
          <h1 class="uc-title">谁是卧底</h1>
        </div>
      </header>

      <section v-if="screen === 'setup'" class="panel-card">
        <div class="stepper-row is-compact">
          <div>
            <div class="stepper-label">玩家人数</div>
            <div class="stepper-help">支持 4 到 12 人</div>
          </div>
          <el-input-number v-model="settings.totalPlayers" :min="4" :max="12" />
        </div>

        <div class="stepper-row is-compact">
          <div>
            <div class="stepper-label">卧底人数</div>
            <div class="stepper-help">手动设置，不自动分配</div>
          </div>
          <el-input-number
            v-model="settings.undercoverCount"
            :min="1"
            :max="Math.max(1, settings.totalPlayers - 1)"
          />
        </div>

        <div class="notice-row" :class="setupError ? 'is-error' : 'is-info'">
          {{ setupError || setupHint }}
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <span>平民人数</span>
            <strong>{{ civilianTargetCount }}</strong>
          </div>
          <div class="summary-card">
            <span>卧底人数</span>
            <strong>{{ settings.undercoverCount }}</strong>
          </div>
          <div class="summary-card">
            <span>进行方式</span>
            <strong>传手机</strong>
          </div>
        </div>

        <el-button
          type="primary"
          size="large"
          class="primary-action"
          :disabled="Boolean(setupError)"
          @click="startGame"
        >
          开始游戏
        </el-button>
      </section>

      <section v-else-if="screen === 'deal'" class="panel-card deal-panel">
        <div class="panel-header">
          <div>
            <h2>依次发词</h2>
            <p>请玩家轮流查看自己的词语，注意遮挡屏幕。</p>
          </div>
          <span class="panel-chip">{{ dealPlayerIndex + 1 }} / {{ players.length }}</span>
        </div>

        <div class="deal-body" :class="{ 'is-revealed': dealRevealed }">
          <template v-if="!dealRevealed">
            <p class="deal-title">请第 {{ currentDealPlayer?.id }} 位玩家拿好手机</p>
            <p class="deal-help">点击下方按钮查看词语，其他人请先移开视线。</p>
          </template>
          <template v-else>
            <p class="deal-title">你的词语是</p>
            <div class="deal-word">{{ currentDealPlayer?.word }}</div>
            <p class="deal-help">请牢记词语，不要告诉别人。</p>
          </template>
        </div>

        <div class="bottom-dock">
          <div class="dock-tip">
            {{ dealRevealed ? '记住后再交给下一位玩家' : '请确认身边没有旁观者' }}
          </div>
          <el-button type="primary" size="large" class="primary-action" @click="handleDealAction">
            {{ dealActionLabel }}
          </el-button>
        </div>
      </section>

      <section v-else-if="screen === 'play'" class="play-layout">
        <div class="status-card">
          <div>
            <div class="status-round">第 {{ currentRound }} 轮</div>
            <div class="status-phase">{{ phase === 'describe' ? '描述阶段' : '淘汰阶段' }}</div>
          </div>
          <div class="status-counts">
            <span>平民 {{ civilianAliveCount }}</span>
            <span>卧底 {{ undercoverAliveCount }}</span>
          </div>
        </div>

        <div class="panel-card compact-card">
          <template v-if="phase === 'describe'">
            <h2 class="section-title">线下描述完成后，直接进入淘汰</h2>
            <p class="section-text">不要直接说出词语本身。</p>
          </template>
          <template v-else>
            <h2 class="section-title">大家讨论结束后，点击要淘汰的玩家</h2>
            <p class="section-text">已出局玩家会变灰，不可再次选择。</p>
          </template>
        </div>

        <div class="player-grid">
          <button
            v-for="player in players"
            :key="player.id"
            type="button"
            class="player-card"
            :class="{
              'is-out': player.isOut,
              'is-clickable': phase === 'eliminate' && !player.isOut,
            }"
            :disabled="phase !== 'eliminate' || player.isOut"
            @click="openElimination(player.id)"
          >
            <span class="player-id">{{ player.id }} 号玩家</span>
            <span v-if="player.isOut" class="player-role"
              >{{ roleTextMap[player.role] }} · 已出局</span
            >
            <span v-else class="player-role">
              {{ phase === 'eliminate' ? '点击淘汰' : '存活中' }}
            </span>
          </button>
        </div>

        <div v-if="phase === 'describe'" class="bottom-dock">
          <div class="dock-tip">线下沟通完成后，直接进入淘汰阶段。</div>
          <el-button
            type="primary"
            size="large"
            class="primary-action is-inline"
            @click="enterEliminationPhase"
          >
            全部描述完毕，进入淘汰
          </el-button>
        </div>

        <div v-else class="bottom-dock">
          <div class="dock-tip">点击存活玩家后，会先弹出确认框，再公布身份。</div>
        </div>
      </section>

      <section v-else class="panel-card result-panel">
        <div class="result-banner" :class="winner === 'civilian' ? 'is-civilian' : 'is-undercover'">
          <div class="result-label">本局结算</div>
          <h2>{{ winnerTitle }}</h2>
          <p>{{ winnerDescription }}</p>
        </div>

        <div class="word-reveal">
          <div class="word-card">
            <span>平民词</span>
            <strong>{{ currentWords.civilian }}</strong>
          </div>
          <div class="word-card undercover-word">
            <span>卧底词</span>
            <strong>{{ currentWords.undercover }}</strong>
          </div>
        </div>

        <div class="identity-section">
          <h3>身份揭晓</h3>
          <div class="identity-list">
            <div v-for="player in players" :key="player.id" class="identity-item">
              <div class="identity-main">
                <strong>{{ player.id }} 号玩家</strong>
                <span
                  class="identity-role"
                  :class="player.role === 'undercover' ? 'is-undercover' : 'is-civilian'"
                >
                  {{ roleTextMap[player.role] }}
                </span>
                <span class="identity-word">{{ player.word }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="dual-actions result-actions">
          <el-button size="large" class="secondary-action" @click="goBackToSetup"
            >重新设置</el-button
          >
          <el-button type="primary" size="large" class="primary-action" @click="restartGame"
            >再来一局</el-button
          >
        </div>
      </section>
    </div>

    <el-dialog v-model="confirmDialogVisible" width="90%" :show-close="false" align-center>
      <template #header>
        <span>确认淘汰</span>
      </template>
      <p class="dialog-text">确定要淘汰 {{ pendingEliminationId }} 号玩家吗？</p>
      <template #footer>
        <div class="dialog-actions">
          <el-button @click="confirmDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmElimination">确定</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="resultDialogVisible" width="90%" :show-close="false" align-center>
      <template #header>
        <span>淘汰结果</span>
      </template>
      <div class="dialog-result">
        <strong>{{ lastEliminated?.id }} 号玩家出局</strong>
        <p>身份是：{{ lastEliminated ? roleTextMap[lastEliminated.role] : '' }}</p>
      </div>
      <template #footer>
        <div class="dialog-actions">
          <el-button type="primary" @click="continueAfterElimination">继续游戏</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  countRemainingRoles,
  createPlayers,
  drawWordPair,
  eliminatePlayer,
  resolveWinner,
  type PlayerRole,
  type PlayerState,
  type WinnerRole,
} from './gameLogic'
import type { WordPair } from './wordList'

type ScreenState = 'setup' | 'deal' | 'play' | 'result'
type GamePhase = 'describe' | 'eliminate'

interface GameSettings {
  totalPlayers: number
  undercoverCount: number
}

const SETTINGS_STORAGE_KEY = 'lrctools:undercover:settings'

const defaultSettings: GameSettings = {
  totalPlayers: 6,
  undercoverCount: 2,
}

const router = useRouter()

const roleTextMap: Record<PlayerRole, string> = {
  civilian: '平民',
  undercover: '卧底',
}

const settings = reactive<GameSettings>({ ...defaultSettings })
const screen = ref<ScreenState>('setup')
const phase = ref<GamePhase>('describe')
const currentWords = reactive<WordPair>({ civilian: '', undercover: '' })
const players = ref<PlayerState[]>([])
const currentRound = ref(1)
const dealPlayerIndex = ref(0)
const dealRevealed = ref(false)
const pendingEliminationId = ref<number | null>(null)
const confirmDialogVisible = ref(false)
const resultDialogVisible = ref(false)
const lastEliminated = ref<PlayerState | null>(null)
const winner = ref<WinnerRole>(null)
const usedWordIndices = ref<number[]>([])
const isReadyToPersist = ref(false)

const civilianTargetCount = computed(() => settings.totalPlayers - settings.undercoverCount)
const remainingRoles = computed(() => countRemainingRoles(players.value))
const civilianAliveCount = computed(() => remainingRoles.value.civilians)
const undercoverAliveCount = computed(() => remainingRoles.value.undercovers)
const currentDealPlayer = computed(() => players.value[dealPlayerIndex.value] ?? null)
const isLastDealPlayer = computed(() => dealPlayerIndex.value >= players.value.length - 1)
const setupError = computed(() =>
  settings.undercoverCount >= settings.totalPlayers ? '卧底人数必须小于玩家人数' : '',
)
const setupHint = computed(
  () => `平民 ${civilianTargetCount.value} 人，卧底 ${settings.undercoverCount} 人。`,
)
const dealActionLabel = computed(() => {
  if (!dealRevealed.value) return '点击查看我的词语'
  return isLastDealPlayer.value ? '全部完成，开始游戏' : '记住了，下一位'
})
const winnerTitle = computed(() =>
  winner.value === 'civilian' ? '恭喜平民获胜！' : '恭喜卧底获胜！',
)
const winnerDescription = computed(() =>
  winner.value === 'civilian'
    ? '你们通过描述和讨论找出了所有卧底。'
    : '场上剩余平民数已经小于等于卧底数，卧底达成胜利条件。',
)

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const syncSettingsBounds = () => {
  settings.totalPlayers = clamp(settings.totalPlayers, 4, 12)
  settings.undercoverCount = clamp(settings.undercoverCount, 1, settings.totalPlayers - 1)
}

const loadSettings = () => {
  const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
  if (!raw) {
    syncSettingsBounds()
    return
  }

  try {
    const parsed = JSON.parse(raw) as Partial<GameSettings>
    settings.totalPlayers = clamp(
      Number(parsed.totalPlayers) || defaultSettings.totalPlayers,
      4,
      12,
    )
    settings.undercoverCount = Number(parsed.undercoverCount) || defaultSettings.undercoverCount
    syncSettingsBounds()
  } catch {
    syncSettingsBounds()
  }
}

const saveSettings = () => {
  localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({
      totalPlayers: settings.totalPlayers,
      undercoverCount: settings.undercoverCount,
    }),
  )
}

const resetTransientState = () => {
  phase.value = 'describe'
  currentRound.value = 1
  dealPlayerIndex.value = 0
  dealRevealed.value = false
  pendingEliminationId.value = null
  confirmDialogVisible.value = false
  resultDialogVisible.value = false
  lastEliminated.value = null
  winner.value = null
}

const goHome = () => {
  router.push('/')
}

const startGame = () => {
  syncSettingsBounds()

  if (setupError.value) return

  const drawResult = drawWordPair(usedWordIndices.value)
  usedWordIndices.value = drawResult.nextUsedIndices
  currentWords.civilian = drawResult.wordPair.civilian
  currentWords.undercover = drawResult.wordPair.undercover
  players.value = createPlayers(
    settings.totalPlayers,
    settings.undercoverCount,
    drawResult.wordPair,
  )

  resetTransientState()
  screen.value = 'deal'
}

const handleDealAction = () => {
  if (!dealRevealed.value) {
    dealRevealed.value = true
    return
  }

  if (isLastDealPlayer.value) {
    screen.value = 'play'
    return
  }

  dealPlayerIndex.value += 1
  dealRevealed.value = false
}

const enterEliminationPhase = () => {
  phase.value = 'eliminate'
}

const openElimination = (playerId: number) => {
  pendingEliminationId.value = playerId
  confirmDialogVisible.value = true
}

const confirmElimination = () => {
  if (pendingEliminationId.value == null) return

  players.value = eliminatePlayer(players.value, pendingEliminationId.value)
  lastEliminated.value =
    players.value.find((player) => player.id === pendingEliminationId.value) ?? null
  confirmDialogVisible.value = false
  resultDialogVisible.value = true
}

const continueAfterElimination = () => {
  resultDialogVisible.value = false

  const resolvedWinner = resolveWinner(players.value)
  if (resolvedWinner) {
    winner.value = resolvedWinner
    screen.value = 'result'
    return
  }

  currentRound.value += 1
  phase.value = 'describe'
}

const restartGame = () => {
  startGame()
}

const goBackToSetup = () => {
  screen.value = 'setup'
  players.value = []
  currentWords.civilian = ''
  currentWords.undercover = ''
  resetTransientState()
}

watch(() => settings.totalPlayers, syncSettingsBounds)
watch(
  () => ({ ...settings }),
  () => {
    if (!isReadyToPersist.value) return
    saveSettings()
  },
  { deep: true },
)

onMounted(() => {
  loadSettings()
  isReadyToPersist.value = true
})
</script>

<style scoped>
.uc-page {
  min-height: 100vh;
  padding: 8px 0 calc(16px + env(safe-area-inset-bottom));
}

.uc-shell {
  max-width: 560px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.uc-topbar,
.panel-card,
.status-card {
  border-radius: 20px;
  background: linear-gradient(180deg, #ffffff 0%, #f7faff 100%);
  border: 1px solid rgba(91, 155, 245, 0.12);
  box-shadow: 0 10px 24px rgba(60, 103, 186, 0.08);
}

.uc-topbar {
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
}

.uc-topbar-copy {
  display: flex;
  align-items: center;
  gap: 10px;
}

.back-button {
  min-height: 32px;
  padding: 0 10px;
  font-size: 13px;
  border-radius: 14px;
}

.panel-chip,
.status-phase {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.uc-title {
  margin: 0;
  font-size: 22px;
  line-height: 1.1;
  color: #22304a;
}

.panel-card {
  padding: 12px;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.panel-header h2,
.section-title,
.identity-section h3 {
  margin: 0;
  color: #22304a;
}

.panel-header p,
.section-text,
.result-banner p,
.stepper-help,
.dock-tip,
.dialog-text,
.dialog-result p {
  margin: 6px 0 0;
  color: #6a7790;
  line-height: 1.6;
  font-size: 13px;
}

.panel-chip {
  background: #eef4ff;
  color: #4268ad;
  flex-shrink: 0;
}

.stepper-row,
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
}

.stepper-row + .stepper-row {
  border-top: 1px solid rgba(91, 155, 245, 0.08);
}

.stepper-row.is-compact :deep(.el-input-number) {
  width: 116px;
}

.stepper-label {
  font-size: 15px;
  font-weight: 700;
  color: #27344c;
}

.notice-row {
  border-radius: 16px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.6;
}

.notice-row.is-info {
  background: #f3f7ff;
  color: #4268ad;
}

.notice-row.is-error {
  background: #fff1f0;
  color: #d84a3a;
}

.summary-grid,
.word-reveal {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.word-reveal {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.summary-grid,
.word-reveal {
  gap: 8px;
  margin-top: 12px;
}

.summary-card,
.word-card {
  padding: 10px;
  border-radius: 16px;
  background: #f5f8ff;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.summary-card span,
.word-card span,
.result-label,
.status-round,
.player-id {
  font-size: 12px;
  color: #6a7790;
}

.summary-card strong,
.word-card strong {
  font-size: 18px;
  color: #22304a;
}

.primary-action,
.secondary-action {
  width: 100%;
  min-height: 48px;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 700;
}

.primary-action {
  margin-top: 12px;
}

.primary-action.is-inline {
  margin-top: 0;
}

.deal-panel,
.result-panel,
.play-layout {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.deal-body {
  min-height: 220px;
  border-radius: 20px;
  background: linear-gradient(180deg, #eef4ff 0%, #f8fbff 100%);
  padding: 22px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.deal-body.is-revealed {
  background: linear-gradient(180deg, #fff6ef 0%, #fffdf9 100%);
}

.deal-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #22304a;
  line-height: 1.3;
}

.deal-help {
  margin: 14px 0 0;
  font-size: 14px;
  color: #6a7790;
  line-height: 1.7;
}

.deal-word {
  margin-top: 14px;
  font-size: 34px;
  font-weight: 900;
  color: #d96d3d;
  line-height: 1.1;
  word-break: break-all;
}

.bottom-dock {
  position: sticky;
  bottom: 0;
  z-index: 5;
  margin-top: auto;
  padding: 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 28px rgba(36, 65, 120, 0.12);
}

.dock-tip {
  margin: 0 0 10px;
}

.status-card {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.status-round {
  font-weight: 700;
}

.status-phase {
  margin-top: 8px;
  background: #eef4ff;
  color: #4268ad;
}

.status-counts {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  color: #27344c;
  font-weight: 700;
}

.compact-card {
  padding: 14px 16px;
}

.player-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.player-card {
  border: 1px solid rgba(91, 155, 245, 0.12);
  border-radius: 16px;
  background: #ffffff;
  min-height: 76px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  text-align: left;
  color: #22304a;
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    border-color 0.16s ease;
}

.player-card.is-clickable:not(:disabled):active {
  transform: scale(0.98);
}

.player-card.is-out {
  background: #f3f4f6;
  color: #8d96a8;
  border-color: transparent;
}

.player-role,
.identity-role {
  font-size: 16px;
  font-weight: 700;
}

.dual-actions,
.dialog-actions {
  display: flex;
  gap: 10px;
}

.result-banner {
  padding: 18px;
  border-radius: 22px;
}

.result-banner.is-civilian {
  background: linear-gradient(135deg, #eef5ff 0%, #f7fbff 100%);
}

.result-banner.is-undercover {
  background: linear-gradient(135deg, #fff1e9 0%, #fff8f3 100%);
}

.result-banner h2 {
  margin: 8px 0 0;
  color: #22304a;
}

.undercover-word {
  background: #fff5ee;
}

.identity-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.identity-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-radius: 18px;
  background: #f8fbff;
}

.identity-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.identity-word {
  color: #6a7790;
  font-size: 16px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.identity-role.is-civilian {
  color: #4268ad;
}

.identity-role.is-undercover {
  color: #d96d3d;
}

.result-actions {
  margin-top: 4px;
}

.dialog-result strong {
  color: #22304a;
}

@media (min-width: 768px) {
  .uc-page {
    padding: 20px 0 24px;
  }

  .player-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .dual-actions,
  .dialog-actions,
  .status-card,
  .panel-header,
  .stepper-row {
    flex-direction: column;
    align-items: stretch;
  }

  .uc-topbar {
    align-items: center;
    justify-content: flex-start;
  }

  .uc-topbar-copy {
    width: 100%;
    justify-content: flex-start;
  }

  .status-counts {
    align-items: flex-start;
  }

  .player-grid {
    grid-template-columns: 1fr 1fr;
  }

  .deal-title {
    font-size: 24px;
  }

  .deal-word {
    font-size: 32px;
  }
}
</style>
