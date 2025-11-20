/* ============================
   ORIGINAL CODE (preserved)
   The original functions are wrapped in `orig` so they exist and can be used.
   They are NOT auto-bound to the UI to prevent duplicate/conflicting listeners.
   ============================ */

const orig = (function(){
  const inputBoxOrig = document.getElementById("inputBox");
  const timeDisplayOrig = document.getElementById("time");
  const wordCountDisplayOrig = document.getElementById("wordCount");
  const charCountDisplayOrig = (function(){
    let el = document.getElementById("charCount");
    if (!el) {
      el = document.createElement("div"); el.id = "charCount"; el.style.display = "none";
      document.body.appendChild(el);
    }
    return el;
  })();
  const startBtnOrig = document.getElementById("startBtn");
  const resetBtnOrig = document.getElementById("resetBtn");

  let totalTime = 60.00;
  let interval = null;
  let isRunning = false;

  function startTestOrig() {
    inputBoxOrig.disabled = false;
    inputBoxOrig.value = "";
    inputBoxOrig.focus();
    startBtnOrig.disabled = true;
    totalTime = 60.00;
    isRunning = true;

    timeDisplayOrig.textContent = totalTime.toFixed(2);

    interval = setInterval(() => {
      totalTime -= 0.01;
      if (totalTime <= 0) {
        clearInterval(interval);
        totalTime = 0;
        inputBoxOrig.disabled = true;
        isRunning = false;
      }
      timeDisplayOrig.textContent = totalTime.toFixed(2);
      updateStatsOrig();
    }, 10);
  }

  function resetTestOrig() {
    clearInterval(interval);
    inputBoxOrig.value = "";
    inputBoxOrig.disabled = true;
    startBtnOrig.disabled = false;

    totalTime = 60.00;
    timeDisplayOrig.textContent = totalTime.toFixed(2);
    wordCountDisplayOrig.textContent = 0;
    charCountDisplayOrig.textContent = 0;
    isRunning = false;
  }

  function updateStatsOrig() {
    const text = inputBoxOrig.value.trim();
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const chars = text.length;

    wordCountDisplayOrig.textContent = words.length;
    charCountDisplayOrig.textContent = chars;
  }

  return {
    startTestOrig,
    resetTestOrig,
    updateStatsOrig
  };
})();

/* ============================
   ENHANCED TYPING TEST IMPLEMENTATION
   - per-letter highlight (correct/incorrect)
   - mistake counting per mis-spelled word (spaces ignored)
   - difficulty modes
   - reset button
   - localStorage history
   - auto-stop at paragraph completion
   - final accuracy in results
   ============================ */

(function(){
  const paragraphDisplay = document.getElementById('paragraphDisplay');
  const inputBox = document.getElementById('inputBox');
  const timeDisplay = document.getElementById('time');
  const mistakeDisplay = document.getElementById('mistake');
  const wordCountDisplay = document.getElementById('wordCount');
  const accuracyDisplay = document.getElementById('accuracy');
  const resultsDiv = document.getElementById('results');
  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');
  const difficultySelect = document.getElementById('difficulty');
  const historyList = document.getElementById('historyList');
  const clearHistoryBtn = document.getElementById('clearHistory');

  const paragraphs = {
    easy: [
      "The sun rose gently over the quiet town, warming the empty streets.",
      "A small bird sat on the window and chirped happily as the day began.",
      "Sara picked up her bag and walked to school with a bright smile.",
      "The cat stretched, yawned, and curled back into a soft ball of fur.",
      "Tom enjoyed eating fresh bread from the bakery every morning.",
      "Rain fell lightly on the roof, making a soft and calming sound.",
      "The little boy kicked a ball across the playground, laughing aloud.",
      "Jane opened her book and started reading her favorite story again.",
      "A cool breeze blew through the trees as people walked by slowly.",
      "The dog wagged its tail as it waited for its owner to return home."
    ],
    medium: [
      "The market was already busy by sunrise, filled with colorful fruits and loud bargaining.",
      "After months of planning, the group finally took their long-awaited road trip.",
      "Mark stood at the crossroads, unsure which direction would lead him to success.",
      "The museum’s hall echoed softly as visitors admired the ancient artifacts.",
      "A sudden storm forced everyone inside, turning the bright afternoon into darkness.",
      "Tina practiced her speech repeatedly, hoping to impress the judges tomorrow.",
      "The sound of waves crashing became a comfort to him during stressful days.",
      "They moved into the new apartment and spent hours arranging everything perfectly.",
      "Despite the challenges, the team continued working together to finish the project.",
      "The old man shared stories about his youth, each filled with lessons and humor."
    ],
    hard: [
      "As the city expanded outward, the balance between nature and progress became increasingly fragile.",
      "Her research challenged long-held beliefs, sparking debates across academic circles.",
      "The political tension grew as citizens demanded transparency from their leaders.",
      "Although chaos surrounded him, he maintained a calm demeanor that inspired trust.",
      "The novel explored the psychological struggles of individuals trapped in routine.",
      "Advances in technology raised ethical questions about privacy and human autonomy.",
      "The scientist spent years developing a theory that could reshape modern physics.",
      "Economic instability forced families to adapt to uncertain and rapidly changing conditions.",
      "The architect envisioned structures that blended functionality with artistic expression.",
      "In a world overwhelmed by information, the ability to think critically became priceless."
    ]
  };

  let targetText = '';
  let spans = [];
  let timer = null;
  let timeLeft = 60.0;
  let running = false;
  let startTimestamp = null;
  const STORAGE_KEY = 'typing_test_scores_v1';

  function pickRandom(level) {
    const arr = paragraphs[level] || paragraphs.easy;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function renderTarget(text) {
    paragraphDisplay.innerHTML = '';
    spans = [];
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const sp = document.createElement('span');
      sp.dataset.target = ch;
      sp.textContent = ch;
      paragraphDisplay.appendChild(sp);
      spans.push(sp);
    }
  }

  function startNewTest() {
    const level = difficultySelect.value || 'easy';
    targetText = pickRandom(level);
    renderTarget(targetText);

    inputBox.value = '';
    inputBox.disabled = false;
    inputBox.focus();

    clearInterval(timer);
    timeLeft = 60.0;
    running = false;
    startTimestamp = null;

    mistakeDisplay.textContent = '0';
    wordCountDisplay.textContent = '0';
    accuracyDisplay.textContent = '100';
    timeDisplay.textContent = timeLeft.toFixed(2);
    resultsDiv.textContent = '';
  }

  function startTimer() {
    if (running) return;
    running = true;
    startTimestamp = Date.now();
    timer = setInterval(() => {
      const elapsed = (Date.now() - startTimestamp) / 1000;
      timeLeft = Math.max(60 - elapsed, 0);
      timeDisplay.textContent = timeLeft.toFixed(2);
      if (timeLeft <= 0) finishTest();
    }, 50);
  }

  function onInput() {
    startTimer();

    const typed = inputBox.value;

    // overwrite display and highlight
    for (let i = 0; i < spans.length; i++) {
      const sp = spans[i];
      const typedChar = typed[i];
      const targetChar = sp.dataset.target;

      if (typedChar === undefined) {
        sp.textContent = targetChar;
        sp.className = '';
      } else {
        sp.textContent = typedChar;
        sp.className = typedChar === targetChar ? 'correct' : 'incorrect';
      }
    }

    // auto-stop when complete
    if (typed.length >= targetText.length) finishTest();

    // compute mistakes per mis-spelled word
    const typedWords = typed.trim().length ? typed.trim().split(/\s+/) : [];
    const targetWords = targetText.trim().length ? targetText.trim().split(/\s+/) : [];
    let wordMistakes = 0;
    for (let i = 0; i < typedWords.length; i++) {
      if (!targetWords[i]) {
        if (typedWords[i].length > 0) wordMistakes++;
      } else if (typedWords[i] !== targetWords[i]) wordMistakes++;
    }
    mistakeDisplay.textContent = String(wordMistakes);

    wordCountDisplay.textContent = typedWords.length;

    const typedLen = typed.length;
    let correctChars = 0;
    for (let i = 0; i < typedLen && i < spans.length; i++) {
      if (spans[i].classList.contains('correct')) correctChars++;
    }
    const accuracy = typedLen ? Math.round((correctChars / typedLen) * 100) : 100;
    accuracyDisplay.textContent = String(accuracy);
  }

  function finishTest() {
    clearInterval(timer);
    running = false;
    inputBox.disabled = true;

    const elapsed = startTimestamp ? ((Date.now() - startTimestamp) / 1000) : 0;
    const timeUsed = elapsed > 0 ? Math.min(elapsed, 60) : 0.0001;
    const typed = inputBox.value;
    const typedWords = typed.trim().length ? typed.trim().split(/\s+/).length : 0;
    const wpm = Math.round(typedWords / (timeUsed / 60));

    const typedLen = typed.length;
    let correctChars = 0;
    for (let i = 0; i < typedLen && i < spans.length; i++) {
      if (spans[i].classList.contains('correct')) correctChars++;
    }
    const accuracy = typedLen ? Math.round((correctChars / typedLen) * 100) : 100;
    const level = difficultySelect.value || 'easy';

    resultsDiv.innerHTML = `Test ended — WPM: <strong>${wpm}</strong>, Accuracy: <strong>${accuracy}%</strong>, Time used: <strong>${timeUsed.toFixed(2)}s</strong>, Difficulty: <strong>${level}</strong>`;

    const score = { date: new Date().toISOString(), wpm, accuracy, time: Number(timeUsed.toFixed(2)), difficulty: level };
    saveScore(score);
    renderHistory();
  }

  function resetTest() {
    clearInterval(timer);
    startNewTest();
  }

  function readHistory() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch(e){ return []; }
  }

  function saveScore(scoreObj) {
    try {
      const list = readHistory();
      list.unshift(scoreObj);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0,10)));
    } catch(e){}
  }

  function clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
  }

  function renderHistory() {
    const list = readHistory();
    historyList.innerHTML = '';
    if (!list.length) {
      const li = document.createElement('li');
      li.textContent = 'No past tests yet.';
      historyList.appendChild(li);
      return;
    }
    for (const s of list) {
      const li = document.createElement('li');
      const d = new Date(s.date);
      li.innerHTML = `<strong>${s.wpm} WPM</strong> — ${s.accuracy}% — <em>${s.difficulty}</em><div class="meta">${d.toLocaleString()} • ${s.time}s</div>`;
      historyList.appendChild(li);
    }
  }

  // event wiring
  startBtn.addEventListener('click', startNewTest);
  inputBox.addEventListener('input', onInput);
  resetBtn.addEventListener('click', resetTest);
  clearHistoryBtn.addEventListener('click', clearHistory);
  difficultySelect.addEventListener('change', startNewTest);

  // init
  startNewTest();
  renderHistory();
})();
