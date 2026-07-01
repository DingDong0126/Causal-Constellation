'use client'
import { useState, useEffect } from 'react'

export default function WelcomeScreen({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState('')
  const [show, setShow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShow(true), 80); return () => clearTimeout(t) }, [])
  const canSubmit = text.trim().length > 0

  return (
    <div className="welcome">
      <div className="starfield" />
      <div className="starfield star2" />
      <div className={`welcome-inner${show ? ' show' : ''}`}>
        <p className="welcome-eyebrow">CAUSAL CONSTELLATION</p>
        <h1 className="welcome-title">每一个选择，<br />都是一条命运的引力线</h1>
        <p className="welcome-sub">
          在浩瀚的宇宙深处，有人愿意听你讲完整个人生。<br />
          你说出的每一句，都会成为星图里的一颗星。
        </p>
        <div className="welcome-box">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="讲讲你的人生吧——我在听。&#10;可以从任何一个片段开始：一段童年、一次离开、一个让你成为现在的你的瞬间……"
            rows={4}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSubmit) onSubmit(text.trim()) }}
          />
          <button className="welcome-btn" disabled={!canSubmit} onClick={() => onSubmit(text.trim())}>
            点亮我的星图　→
          </button>
        </div>
        <p className="welcome-hint">⌘ + Enter 也可以发送 · 你的故事只属于你</p>
      </div>
    </div>
  )
}
