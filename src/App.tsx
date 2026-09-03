import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import GameScene from './game/GameScene'
import './App.css'

type AppView = 'home' | 'game'
const menuItems = [{ icon:'🗺️',label:'AVVENTURA',available:true },{ icon:'🏆',label:'CLASSIFICHE',available:false },{ icon:'🐶',label:'FRENCHIES',available:false }]

function App() {
  const gameContainer=useRef<HTMLDivElement>(null)
  const [view,setView]=useState<AppView>('home')
  const [notice,setNotice]=useState('')
  useEffect(()=>{if(view!=='game'||!gameContainer.current)return;const game=new Phaser.Game({type:Phaser.AUTO,width:1080,height:1920,parent:gameContainer.current,backgroundColor:'#87CEEB',scene:[GameScene],scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}});return()=>game.destroy(true)},[view])
  const soon=(label:string)=>{setNotice(`${label}: prossimamente`);window.setTimeout(()=>setNotice(''),1800)}
  if(view==='game')return <div className="game-shell"><button className="home-back" onClick={()=>setView('home')} aria-label="Torna alla home">‹</button><div ref={gameContainer} className="game-container" /></div>
  return <main className="home-screen"><div className="sky-glow"/><header className="player-bar"><div className="player"><img src="/chiki-icon.jpeg" alt="Chiki"/><span><strong>Chiki</strong><small>Livello 1</small></span></div><div className="currencies"><span>❤️ 5</span><span>🪙 1.250</span></div></header><section className="brand-panel" aria-label="Frenchie Chiki Match"><img src="/chiki-icon.jpeg" alt="Icona Frenchie Chiki Match" className="official-icon"/><h1><span>FRENCHIE</span><strong>CHIKI</strong><em>MATCH</em></h1><button className="play-button" onClick={()=>setView('game')}>🐾 GIOCA</button></section><nav className="main-menu" aria-label="Menu del gioco">{menuItems.map(item=><button key={item.label} className={item.available?'available':''} onClick={()=>item.available?setView('game'):soon(item.label)}><span>{item.icon}</span>{item.label}</button>)}</nav><nav className="utility-menu" aria-label="Altre funzioni">{['📅 EVENTI','✉️ MESSAGGI','👥 AMICI','⚙️ IMPOSTAZIONI'].map(item=><button key={item} onClick={()=>soon(item.slice(3))}>{item}</button>)}</nav>{notice&&<div className="toast" role="status">{notice}</div>}</main>
}
export default App
