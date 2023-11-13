import React from 'react';
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import PauseButton from "./PauseButton";
import PlayButton from "./PlayButton";
import SettingsButton from './SettingsButton';
import { useContext, useState, useEffect, useRef } from "react";
import SettingsContext from "../SettingsContext";


const Timer = () => {
    const settingsInfo = useContext(SettingsContext);
    
    const [isPaused, setIsPaused] = useState(true)
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [mode, setMode] = useState('work');

    const secondsLeftRef = useRef(secondsLeft);
    const isPausedRef = useRef(isPaused);
    const modeRef = useRef(mode);


function tick() {
    secondsLeftRef.current--;
    setSecondsLeft(secondsLeftRef.current);
}



//   function initTimer() {
//     setSecondsLeft(settingsInfo.workMinutes * 60)
//   }

  useEffect(() => {
//    initTimer();
function switchMode() {
    const nextMode = modeRef.current === 'work' ? 'break' : 'work';
    const nextSeconds = (nextMode === 'work' ? settingsInfo.workMinutes: settingsInfo.breakMinutes) * 60;
  
    setMode(nextMode);
    
    modeRef.current = nextMode
  
    setSecondsLeft(nextSeconds);
   
    secondsLeftRef.current = nextSeconds;
 

}

secondsLeftRef.current = settingsInfo.workMinutes * 60;
setSecondsLeft(secondsLeftRef.current);

  const interval =  setInterval(() => {
       if (isPausedRef.current) {
            return;
       }
       if (secondsLeftRef.current === 0) {
           return switchMode();
       }

       tick();

   },1000)
   return () => clearInterval(interval) 
  }, [settingsInfo])

  const totalSeconds = mode === 'work' ? settingsInfo.workMinutes * 60 : settingsInfo.breakMinutes * 60;
  const percentage = Math.round(secondsLeft / totalSeconds * 100);
  const minutes = Math.floor(secondsLeft / 60);
  let seconds = secondsLeft % 60;
  // const blue = '#1163b5';
  // const green = '#25af33';

  if(seconds < 10) seconds = '0'+seconds;
      
  

  return (
    <div style={{width: 500, height: 'auto'} }>
      <CircularProgressbar
        value={percentage}
        text={minutes + ':' + seconds}
        styles={buildStyles({
          textColor: "#fff",
          pathColor: mode === 'work' ? 'blue' : 'green',
          traillColor: '#d6d6d6',
          startColor:"blue",
          backgroundColor: '#3e98c7',
        })}
      />
      <div style={{ marginTop: "20px" }}>
          {isPaused ?  <PlayButton onClick={() => {setIsPaused(false); isPausedRef.current = false;}}/> 
          :  <PauseButton onClick={() => {setIsPaused(true); isPausedRef.current = true;}} />}
       

        
      </div>
      <div style={{ marginTop: "20px" }}>
        <SettingsButton onClick={() => settingsInfo.setShowSettings(true)} />
      </div>
    </div>
  )
}

export default Timer
