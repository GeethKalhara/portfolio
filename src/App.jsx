import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'
import Profile from '../pages/profile.jsx'
import Navbar from './components/navbar.jsx'
import Hero from './sections/hero.jsx'

function App() {


  const navbarLinks = [
    {label :"About",href :"#about"},
    {label :"Projects",href :"#projects"},
    {label :"Contact",href :"#contact"}

  ]
  
  return (
    <>
      
      <Navbar links={navbarLinks}/>
      <Hero/>
     
    </>

  )
}

export default App
