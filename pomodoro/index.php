<?php
    $mode=@$_GET['mode'];
    if ($mode !== "25" && $mode !== "45") {
        $mode = "25";
    }
?>

<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>25:00 — Pomodoro Timer</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100..900&family=Noto+Color+Emoji&display=swap" rel="stylesheet">
  <style>
    html {
      font-size:100%;
    }

    body {
      font-family: "Montserrat", sans-serif;
    }

    a{
      color:inherit;
    }

    #pomodoro-container {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      align-content: center;
      margin: 0;
      padding: 0.25rem;
      box-sizing: border-box;
    }

    #interval-container {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      z-index:200;
    }

    #timer-container {
      margin-top: 0.125rem;
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    #start-stop-reset-container {
      margin-top: 0.125rem;
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
    }

    #time-left {
      width: 100%;
      font-weight: 900; /* Montserrat Black */
      text-align: center;
      line-height: 0.8;
      padding:0;
      margin:0;
      font-size: clamp(4.5rem, 32vw, 20rem);
      word-break:keep-all;
      margin-top:0.5rem;
      margin-bottom:0;
      font-feature-settings:'tnum';
      letter-spacing: -0.15rem;
    }

    .interval-btn,
    #start-stop-btn,
    #reset-btn,
    #settings-btn,
    #info-btn {
      position: relative;
      border-radius: 50px;
      border: 1px solid black;
      color: black;
      font-size: 1.75rem;
      margin: 0 0.25rem;
      padding: 0 0.55rem;
      text-align: center;
      transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out, border-color 0.2s ease-in-out;
      cursor: pointer;
      text-decoration: none;
      z-index:200;
    }

    #start-stop-btn,
    #reset-btn,
    #settings-btn,
    #info-btn, .interval2-btn, #fullBtn {
      margin: 0.45rem;
      border:none;
      font-size: 2.25rem;
      padding:0;
      transition: none;
      background-color: transparent;
      text-decoration: none;
    }

    .interval-btn:hover {
      background-color: black;
      color: white;
      border-color: black;
      cursor: pointer;
      scale:1.1;
    }

    #start-stop-btn:hover,
    #reset-btn:hover,
    #settings-btn:hover,
    #info-btn:hover, .interval2-btn:hover, #fullBtn:hover {
      scale:1.25;
    }

    #settings-modal {
      display: none;
      align-items: center;
      justify-content: center;
      position: fixed;
      z-index: 1;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      z-index:300;
    }

    .modal-content {
      width:100%;
      max-width:18.75rem;
      color:black;
      align-items: center;
      justify-content: center;
      background-color: #f7f6f3;
      padding: 1rem;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      border-radius: 10px;
      z-index:1000;
    }

    .close-btn {
      color: #000;
      float: right;
      font-size: 2rem;
      font-weight: bold;
      cursor: pointer;
    }

    .setting-option {
      align-item:center;
      margin-bottom: 0.5rem;
    }

    .setting-wrapper {
      text-align:center;
      flex-direction:column;
      display:flex;
      align-item:center;
    }

    .setting-option label {
      text-align:center;
      align-item:center;
      margin-right: 0.5rem;
    }

    #save-btn {
      margin-top:0.5rem;
      width:60%;
      background-color: black;
      color: #fff;
      border: none;
      border-radius: 100px;
      padding: 0.8rem 1.5rem;
      cursor: pointer;
      transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out;
    }

    #save-btn:hover {
      background-color: grey;
      color:white;
    }

    select {
      display: block;
      padding:0.5rem;
      width:100%;
      margin:0.1rem auto;
    }

    hr{
      margin:0.75rem auto;
      max-width:10rem;
      border-width: 2px;
      box-shadow: none;
    }

    .emoji{
      font-family: "Noto Color Emoji", system-ui, serif;
      font-weight: 400;
      font-style: normal;
    }

    /* Extra: Make sure the timer is always visible and fits on small screens */
    @media (max-width: 600px) {
      #pomodoro-container {
        padding: 0.25rem;
      }
      #time-left {
        /*font-size: clamp(4.5rem, 30vw, 12rem);*/
      }
    }
  </style>

  <link rel="icon" href="favicon.png" type="image/png">
  <meta property="og:title" content="🍅 Pomodoro Timer">
  <meta property="og:description" content="Simple and effective Pomodoro timer to boost your productivity">
  <meta property="og:image" content="favicon.png">
  <meta property="og:url" content="https://pomodoro.mysearch.one">
  <meta property="og:type" content="website">
  <script defer src="https://cloud.umami.is/script.js" data-website-id="99e24bb6-9edd-4ab9-a040-b30607ed8b59" data-tag="pomodoro"></script>
</head>

<body>
  <div id="pomodoro-container" data-mode="<?php echo htmlspecialchars($mode); ?>">
    <div id="interval-container">
      <button id="break-1-interval-btn" class="interval-btn" style="display:none;"><span class="emoji">😴</span> 1</button>
      <div id="btn25">
        <button id="short-break-interval-btn" class="interval-btn"><span class="emoji">😴</span> 5</button>
        <button id="long-break-interval-btn" class="interval-btn" style="display:none;"><span class="emoji">😴</span> 10</button>
        <button id="break-15-interval-btn" class="interval-btn"><span class="emoji">😴</span> 15</button>
        <button id="pomodoro-interval-btn" class="interval-btn"><span class="emoji">🍅</span> 25</button>
        <button id="break-30-interval-btn" class="interval-btn"><span class="emoji">😴</span> 30</button>
        <button id="pomodoro-45-interval-btn" class="interval-btn"><span class="emoji">🍅</span> 45</button>
    </div>
    <div id="timer-container">
      <div id="time-left">25:00</div>
    </div>
    <div id="start-stop-reset-container">
      <button title="Start/pause timer" id="start-stop-btn"><span class="emoji">▶️</span></button>
      <button title="Reset timer" id="reset-btn"><span class="emoji">🔄️</span></button>
      <button title="Settings" id="settings-btn"><span class="emoji">⚙️</span></button>
      <a href="https://www.linkedin.com/in/fedorananin/" target="_blank" id="info-btn" title="Made by Fëdor Ananin"><span class="emoji">ℹ️</span></a>
      <a href="?mode=45" id="btnMode45" class="interval2-btn" title="Switch to the 45 minutes mode"><span class="emoji">⏱️</span></a>
      <a href="?mode=25" id="btnMode25" class="interval2-btn" title="Switch to the 25 minutes mode"><span class="emoji">⏱️</span></a>
      <a href="javascript:;" title="Fullscreen" id="fullBtn" onclick="toggleFullscreen();"><span class="emoji">🔍</span></a>
    </div>
  </div>

  <!-- Modal for Settings -->
  <div id="settings-modal" class="modal">
    <div class="modal-content">
      <span class="close-btn">&times;</span>
      <div class="setting-wrapper">
      <h3>Settings</h3>
      <div class="setting-option">
        <label for="background-color">Background Color</label>
        <select id="background-color">
          <option value="#FFFFFF">LM Default White</option>
          <option value="#F7F6F3">LM Off White</option>
          <option value="#F1F1EF">LM Notion Grey</option>
          <option value="#F4EEEE">LM Notion Brown</option>
          <option value="#FAEBDD">LM Notion Orange</option>
          <option value="#FBF3DB">LM Notion Yellow</option>
          <option value="#EDF3EC">LM Notion Green</option>
          <option value="#E7F3F8">LM Notion Blue</option>
          <option value="#F6F3F9">LM Notion Purple</option>
          <option value="#FAF1F5">LM Notion Pink</option>
          <option value="#FDEBEC">LM Notion Red</option>
          
          <option value="#191919">DM Default</option>
          <option value="#262626">DM Hover</option>
          <option value="#202020">DM Sidebar</option>
          <option value="#434040">DM Notion Brown</option>
          <option value="#594A3A">DM Notion Orange</option>
          <option value="#FDEBB9">DM Notion Yellow</option>
          <option value="#D6FAD8">DM Notion Green</option>
          <option value="#364954">DM Notion Blue</option>
          <option value="#443F57">DM Notion Purple</option>
          <option value="#533B4C">DM Notion Pink</option>
          <option value="#594141">DM Notion Red</option>
        </select>
      </div>
      <div class="setting-option">
        <label for="font-color">Font Color</label>
        <select id="font-color">
          <option value="#37352F">LM Notion Default</option>
          <option value="#787774">LM Notion Grey</option>
          <option value="#9F6B53">LM Notion Brown</option>
          <option value="#D9730D">LM Notion Orange</option>
          <option value="#CB912F">LM Notion Yellow</option>
          <option value="#448361">LM Notion Green</option>
          <option value="#337EA9">LM Notion Blue</option>
          <option value="#9065B0">LM Notion Purple</option>
          <option value="#C14C8A">LM Notion Pink</option>
          <option value="#D44C47">LM Notion Red</option>
          
          <option value="#979A9B">DM Notion Grey</option>
          <option value="#D4D4D4">DM White</option>
          <option value="#937264">DM Notion Brown</option>
          <option value="#FFA344">DM Notion Orange</option>
          <option value="#FFDC49">DM Notion Yellow</option>
          <option value="#4DAB9A">DM Notion Green</option>
          <option value="#529CCA">DM Notion Blue</option>
          <option value="#9A6DD7">DM Notion Purple</option>
          <option value="#E255A1">DM Notion Pink</option>
          <option value="#FF7369">DM Notion Red</option>
        </select>
      </div>
      <div class="setting-option">
        <label for="volume">Volume</label>
        <select id="volume">
          <option value="0">0%</option>
          <option value="0.01">1%</option>
          <option value="0.05">5%</option>
          <option value="0.1">10%</option>
          <option value="0.2">20%</option>
          <option value="0.3">35%</option>
          <option value="0.5">50%</option>
          <option value="0.75">75%</option>
          <option value="1">100%</option>
        </select>
        <button id="save-btn">Save</button>
      </div>
      
      </div>
    </div>
  </div>

  <script>
        // Emoji constants
    const EMOJI_PLAY = '<span class="emoji">▶️</span>';
    const EMOJI_PAUSE = '<span class="emoji">⏸️</span>';
    const EMOJI_TOMATO = '🍅';
    const EMOJI_PARTY = '<span class="emoji">🥳</span>';
    const EMOJI_SLEEP = '<span class="emoji">😴</span>';

    // Global variables
    let timeLeft = 25 * 60; // seconds
    let timerInterval;
    let currentInterval = 'pomodoro';
    let backgroundColor = '#191919'; // Default background color
    let fontColor = '#D4D4D4'; // Default font color
    let volume = 0.75; // Default volume

    // DOM elements
    const timeLeftEl = document.getElementById('time-left');
    const startStopBtn = document.getElementById('start-stop-btn');
    const resetBtn = document.getElementById('reset-btn');
    const pomodoroIntervalBtn = document.getElementById('pomodoro-interval-btn');
    const shortBreakIntervalBtn = document.getElementById('short-break-interval-btn');
    const longBreakIntervalBtn = document.getElementById('long-break-interval-btn');
    const pomodoro45IntervalBtn = document.getElementById('pomodoro-45-interval-btn');
    const break15IntervalBtn = document.getElementById('break-15-interval-btn');
    const break30IntervalBtn = document.getElementById('break-30-interval-btn'); // New break-30 button
    const break1IntervalBtn = document.getElementById('break-1-interval-btn'); // New break-1 button
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const backgroundColorSelect = document.getElementById('background-color');
    const fontColorSelect = document.getElementById('font-color');
    const volumeSelect = document.getElementById('volume');
    const saveBtn = document.getElementById('save-btn');

    // Check if #pomodoro-container has data-mode "p45"
    const pomodoroContainer = document.getElementById('pomodoro-container');
    const dataMode = pomodoroContainer.getAttribute('data-mode');

    if (dataMode === '25') {
      document.getElementById('btnMode25').style.display = 'none';
      //break15IntervalBtn.style.display = 'none';
      break30IntervalBtn.style.display = 'none';
      pomodoro45IntervalBtn.style.display = 'none';
    } else if (dataMode === '45') {
      document.getElementById('btnMode45').style.display = 'none';
      shortBreakIntervalBtn.style.display = 'none';
      longBreakIntervalBtn.style.display = 'none';
      pomodoroIntervalBtn.style.display = 'none';
      timeLeft = 45 * 60;
      currentInterval = 'pomodoro-45';
    } 

    updateTimeLeftTextContent();

    // Event listeners for interval buttons
    pomodoroIntervalBtn.addEventListener('click', () => {
      stopTimer();
      currentInterval = 'pomodoro';
      timeLeft = 25 * 60;
      updateTimeLeftTextContent();
      startTimer();
    });

    shortBreakIntervalBtn.addEventListener('click', () => {
      stopTimer();
      currentInterval = 'short-break';
      timeLeft = 5 * 60;
      updateTimeLeftTextContent();
      startTimer();
    });

    longBreakIntervalBtn.addEventListener('click', () => {
      stopTimer();
      currentInterval = 'long-break';
      timeLeft = 10 * 60;
      updateTimeLeftTextContent();
      startTimer();
    });

    pomodoro45IntervalBtn.addEventListener('click', () => {
      stopTimer();
      currentInterval = 'pomodoro-45';
      timeLeft = 45 * 60;
      updateTimeLeftTextContent();
      startTimer();
    });

    break15IntervalBtn.addEventListener('click', () => {
      stopTimer();
      currentInterval = 'break-15';
      timeLeft = 15 * 60;
      updateTimeLeftTextContent();
      startTimer();
    });

    break30IntervalBtn.addEventListener('click', () => {
      stopTimer();
      currentInterval = 'break-30';
      timeLeft = 30 * 60;
      updateTimeLeftTextContent();
      startTimer();
    });

    break1IntervalBtn.addEventListener('click', () => {
      stopTimer();
      currentInterval = 'break-1';
      timeLeft = 1 * 5;
      updateTimeLeftTextContent();
      startTimer();
    });

    // Event listener for start/stop button
    startStopBtn.addEventListener('click', () => {
      if (startStopBtn.innerHTML === EMOJI_PLAY) {
        startTimer();
        startStopBtn.innerHTML = EMOJI_PAUSE;
      } else {
        stopTimer();
      }
    });

    // Event listener for reset button
    resetBtn.addEventListener('click', () => {
      stopTimer();
      if (currentInterval === 'pomodoro') {
        timeLeft = 25 * 60;
      } else if (currentInterval === 'short-break') {
        timeLeft = 5 * 60;
      } else if (currentInterval === 'long-break') {
        timeLeft = 10 * 60;
      } else if (currentInterval === 'pomodoro-45') {
        timeLeft = 45 * 60;
      } else if (currentInterval === 'break-15') {
        timeLeft = 15 * 60;
      } else if (currentInterval === 'break-30') {
        timeLeft = 30 * 60;
      } else if (currentInterval === 'break-1') {
        timeLeft = 1 * 60;
      }
      updateTimeLeftTextContent();
      startStopBtn.innerHTML = EMOJI_PLAY;
    });

    // Event listener for settings button
    settingsBtn.addEventListener('click', () => {
      settingsModal.style.display = 'flex';
    });

    // Event listener for close button in the settings modal
    closeModalBtn.addEventListener('click', () => {
      settingsModal.style.display = 'none';
    });

    // Event listener for save button in the settings modal
    saveBtn.addEventListener('click', () => {
      const newBackgroundColor = backgroundColorSelect.value;
      const newFontColor = fontColorSelect.value;
      const newVolume = parseFloat(volumeSelect.value);

      // Save preferences to localStorage
      localStorage.setItem('backgroundColor', newBackgroundColor);
      localStorage.setItem('fontColor', newFontColor);
      localStorage.setItem('volume', newVolume);

      // Apply the new saved preferences
      applyUserPreferences();

      // Close the modal after saving preferences
      settingsModal.style.display = 'none';
    });

    // Function to start the timer
    function startTimer() {
      const dataMode = document.getElementById('pomodoro-container').getAttribute('data-mode');
      startStopBtn.innerHTML = EMOJI_PAUSE;
      timerInterval = setInterval(() => {
        timeLeft--;
        loop = 5;
        sound = 'sound';
        updateTimeLeftTextContent();
        if (timeLeft === 0) {
          clearInterval(timerInterval);// Play sound when timer ends
          if (currentInterval === 'pomodoro') {
            timeLeft = 25 * 60;
            currentInterval = 'pomodoro';
            stopTimer();
            loop = 1;
            sound = 'reward';
          } else if (currentInterval === 'long-break') {
            timeLeft = 25 * 60;
            currentInterval = 'pomodoro';
            stopTimer();
          } else if (currentInterval === 'short-break') {
            timeLeft = 25 * 60;
            currentInterval = 'pomodoro';
            stopTimer();
          } else if (currentInterval === 'pomodoro-45') {
            timeLeft = 45 * 60;
            currentInterval = 'pomodoro-45';
            stopTimer();
            loop = 1;
            sound = 'reward';
          } else if (currentInterval === 'break-15') {
            if (dataMode === "25") {
              timeLeft = 25 * 60;
              currentInterval = 'pomodoro';
            } else {
              timeLeft = 45 * 60;
              currentInterval = 'pomodoro-45';
            }
            stopTimer();
          } else if (currentInterval === 'break-30') {
            timeLeft = 45 * 60;
            currentInterval = 'pomodoro-45';
            stopTimer();
          } else if (currentInterval === 'break-1') {
            timeLeft = 25 * 60;
            currentInterval = 'pomodoro';
            stopTimer();
            loop = 1;
            sound = 'reward';
          }
          playSound(volume, loop, sound);
        }
      }, 1000);
    }

    // Function to stop the timer
    function stopTimer() {
      clearInterval(timerInterval);
      startStopBtn.innerHTML = EMOJI_PLAY;
      updateTimeLeftTextContent();
    }

    // Function to update the time left text content
    function updateTimeLeftTextContent() {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      timeLeftEl.textContent = formattedTime;
      document.title = `${formattedTime} — Pomodoro Timer`;
    }

    function getQuote() {
      let quote = '';
      const xhr = new XMLHttpRequest();
      xhr.open('GET', 'quote.php', false);
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
          quote = xhr.responseText;
        }
      };
      xhr.send();
      return quote;
    }

    // Function to play sound when timer ends
    function playSound(volume = 0.75, loop = 5, sound = 'sound') {
      
      const audio = new Audio(sound === 'reward' ? 'reward.mp3' : 'sound.mp3');
      audio.volume = volume; // Set volume to the specified level
      let playCount = 0;
      audio.addEventListener('ended', () => {
        playCount++;
        if (playCount < loop) {
          audio.play();
        }
      });
      audio.play();

      // Create a full-screen button to stop the sound
      const stopSoundBtn = document.createElement('button');
      stopSoundBtn.id = 'stopSound';
      stopSoundBtn.innerHTML = `<b style="font-weight:900;font-size:3rem;">${EMOJI_PARTY} Finished!</b><br><small style="font-size:1.75rem;">Click anywhere to continue.</small><hr><i style="font-size:1.15rem;">${getQuote()}</i>`;
      stopSoundBtn.style.position = 'fixed';
      stopSoundBtn.style.top = '0';
      stopSoundBtn.style.left = '0';
      stopSoundBtn.style.width = '100%';
      stopSoundBtn.style.height = '100%';
      stopSoundBtn.style.zIndex = '1000';
      stopSoundBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      stopSoundBtn.style.color = 'white';
      stopSoundBtn.style.border = 'none';
      stopSoundBtn.style.cursor = 'pointer';

      // Append the button to the body
      document.body.appendChild(stopSoundBtn);

      // Add event listener to stop the sound and remove the button
      stopSoundBtn.addEventListener('click', () => {
        audio.pause();
        audio.currentTime = 0; // Reset audio to the start
        document.body.removeChild(stopSoundBtn);
      });
    }

    // Function to apply the user's saved preferences
    function applyUserPreferences() {
      // Retrieve user preferences from localStorage
      const savedBackgroundColor = localStorage.getItem('backgroundColor');
      const savedFontColor = localStorage.getItem('fontColor');
      const savedVolume = localStorage.getItem('volume');

      // Apply the preferences if they exist in localStorage
      if (savedBackgroundColor) {
        backgroundColor = savedBackgroundColor;
      }

      if (savedFontColor) {
        fontColor = savedFontColor;
      }

      if (savedVolume) {
        volume = parseFloat(savedVolume);
      }

      // Set the selected option in the select elements
      backgroundColorSelect.value = backgroundColor;
      fontColorSelect.value = fontColor;
      volumeSelect.value = volume.toString();

      // Apply the preferences to the Pomodoro Timer widget
      document.body.style.backgroundColor = backgroundColor;
      document.body.style.color = fontColor;
      timeLeftEl.style.color = fontColor;
      // Update the buttons' font and background color
      const buttons = document.querySelectorAll('.interval-btn, #start-stop-btn, #reset-btn, #settings-btn');
      buttons.forEach((button) => {
        button.style.color = fontColor;
        button.style.backgroundColor = backgroundColor;
        button.style.borderColor = fontColor;
      });
    }

    // Apply user preferences on page load
    applyUserPreferences();

    function toggleFullscreen() {
      var elem = document.documentElement;
      if (
        document.fullscreenElement ||       // Стандарт
        document.webkitFullscreenElement || // Safari
        document.msFullscreenElement        // IE/Edge
      ) {
        // Уже в полноэкранном режиме — выйти
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { // Safari
          document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // IE11
          document.msExitFullscreen();
        }
      } else {
        // Не в полноэкранном режиме — войти
        if (elem.requestFullscreen) {
          elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) { // Safari
          elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { // IE11
          elem.msRequestFullscreen();
        }
      }
    }
  </script>
</body>

</html>
