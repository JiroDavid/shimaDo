const PIECE = String.raw`(?:\p{Extended_Pictographic}[\u{1F3FB}-\u{1F3FF}️]*|\p{Regional_Indicator}|[#*0-9]️?⃣|[‍\u{E0020}-\u{E007F}️\u{1F3FB}-\u{1F3FF}])`
const EMOJI = new RegExp(String.raw`^(?=.*(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣))${PIECE}+$`, 'su')

export function isEmoji(s: unknown): s is string {
  return typeof s === 'string' && s.length >= 1 && s.length <= 16 && EMOJI.test(s)
}

export const EMOJI_GROUPS: { name: string; emoji: string[] }[] = [
  { name: 'Faces', emoji: ['😀', '😂', '🥹', '😍', '😎', '🤔', '😴', '🥳', '😭', '😡', '🤯', '🙃', '😇', '🤗', '🫡', '😅'] },
  { name: 'People', emoji: ['👍', '👎', '👏', '🙌', '🙏', '💪', '👀', '🫶', '👋', '✌️', '🤞', '👌', '🧠', '🫂', '🧑‍💻', '🤝'] },
  { name: 'Symbols', emoji: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '⭐', '✨', '🔥', '⚡', '💯', '✅', '❌', '⚠️'] },
  { name: 'Nature', emoji: ['🐱', '🐶', '🦊', '🐼', '🦄', '🐢', '🌸', '🌿', '🌙', '☀️', '🌈', '🍀', '🌊', '🌵', '🦋', '🐝'] },
  { name: 'Food', emoji: ['🍎', '🍕', '🍔', '🍜', '🍣', '🍩', '☕', '🍵', '🧋', '🍫', '🍓', '🥑', '🍙', '🍪', '🥐', '🍉'] },
  { name: 'Activity', emoji: ['⚽', '🏀', '🎮', '🎧', '🎵', '🎨', '📚', '🏆', '🎯', '🚀', '🎬', '🧩', '🏋️', '🚴', '🎸', '🎲'] },
  { name: 'Objects', emoji: ['💡', '📌', '📎', '✏️', '📝', '🗓️', '⏰', '🔔', '💻', '📱', '🔒', '🔑', '🎁', '🧸', '📷', '🔧'] }
]
