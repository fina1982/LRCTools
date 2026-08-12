import { WORD_LIST, type WordPair } from './wordList'

export type PlayerRole = 'civilian' | 'undercover'
export type WinnerRole = PlayerRole | null

export interface PlayerState {
  id: number
  role: PlayerRole
  word: string
  isOut: boolean
}

const randomPick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)]

const shuffle = <T>(items: T[]) => {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const currentItem = next[index]!
    next[index] = next[randomIndex]!
    next[randomIndex] = currentItem
  }
  return next
}

export const drawWordPair = (usedIndices: number[]) => {
  const allIndices = WORD_LIST.map((_, index) => index)
  let availableIndices = allIndices.filter((index) => !usedIndices.includes(index))
  let nextUsedIndices = [...usedIndices]

  if (!availableIndices.length) {
    availableIndices = allIndices
    nextUsedIndices = []
  }

  const selectedIndex = randomPick(availableIndices)!
  return {
    wordPair: WORD_LIST[selectedIndex]!,
    nextUsedIndices: [...nextUsedIndices, selectedIndex],
  }
}

export const createPlayers = (
  totalPlayers: number,
  undercoverCount: number,
  wordPair: WordPair,
) => {
  const undercoverIds = new Set(
    shuffle(Array.from({ length: totalPlayers }, (_, index) => index + 1)).slice(
      0,
      undercoverCount,
    ),
  )

  return Array.from({ length: totalPlayers }, (_, index) => {
    const id = index + 1
    const role: PlayerRole = undercoverIds.has(id) ? 'undercover' : 'civilian'

    return {
      id,
      role,
      word: role === 'undercover' ? wordPair.undercover : wordPair.civilian,
      isOut: false,
    }
  })
}

export const eliminatePlayer = (players: PlayerState[], playerId: number) =>
  players.map((player) => (player.id === playerId ? { ...player, isOut: true } : player))

export const countRemainingRoles = (players: PlayerState[]) => {
  const alivePlayers = players.filter((player) => !player.isOut)

  return {
    civilians: alivePlayers.filter((player) => player.role === 'civilian').length,
    undercovers: alivePlayers.filter((player) => player.role === 'undercover').length,
  }
}

export const resolveWinner = (players: PlayerState[]): WinnerRole => {
  const { civilians, undercovers } = countRemainingRoles(players)

  if (undercovers === 0) return 'civilian'
  if (civilians <= undercovers) return 'undercover'
  return null
}
