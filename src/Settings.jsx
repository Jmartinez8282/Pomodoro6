import ReactSlider from 'react-slider';
import SettingsContext from './SettingsContext';
import './slider.css'
import {useContext} from 'react';
import BackButtons from './components/BackButtons';


const Settings = () => {
    const settingsInfo = useContext(SettingsContext)

    return (

        <div style={{textAlign:'left'}}>
            <label>work: {settingsInfo.workMinutes}:00</label>
            <ReactSlider
            className={'slider'}
            thumbClassName={'thumb'}
            trackClassName={'track'}
            valu={settingsInfo.workMinutes}
            onChange={newValue => settingsInfo.setWorkMinutes(newValue)}
            min={1}
            max={120}
            />
            <label>break: {settingsInfo.breakMinutes}:00</label>
            <ReactSlider
            className={'slider green'}
            thumbClassName={'thumb'}
            trackClassName={'track'}
            valu={settingsInfo.breakMinutes}
            onChange={newValue => settingsInfo.setBreakMinutes(newValue)}
            min={1}
            max={120}
            />
            <div style={{textAlign:'center', marginTop:'20px'}}>
            <BackButtons onClick={() => settingsInfo.setShowSettings(false)}/>
            </div>
            
            
        </div>
    )
}

export default Settings
