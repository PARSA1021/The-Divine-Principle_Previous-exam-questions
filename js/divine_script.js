// Constants
const TIME_LIMIT = 60;
const FEEDBACK_DURATION = 3000; // 3 seconds for temporary feedback
const GOLDEN_RATIO = 1.618;

// DOM Elements
const quizContainer = document.getElementById("quiz-container");
const nextButton = document.getElementById("next-question");
const checkButton = document.getElementById("check-answer");
const progress = document.getElementById("progress");
const progressBar = document.getElementById("progress-bar");
const errorMessage = document.getElementById("error-message");

// State
let state = {
    currentQuestionIndex: 0,
    questions: [],
    selectedAnswers: [],
    selectedCounts: {},
    score: 0,
    totalCorrectAnswers: 0,
    totalPossiblePoints: 0,
    timeLeft: TIME_LIMIT,
    timer: null,
    answeredCorrectly: false,
    isPaused: false
};

// Utility Functions
const shuffleArray = array => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

// Load Questions
const loadQuestions = async () => {
    try {
        const response = await fetch("assets/data/divine_pr.json");
        if (!response.ok) throw new Error("JSON 파일 로드 실패");
        state.questions = shuffleArray(await response.json());
        if (!state.questions.every(q => q.question && Array.isArray(q.options) && Array.isArray(q.answers))) {
            throw new Error("유효하지 않은 데이터 형식");
        }
        state.currentQuestionIndex = 0;
        state.score = 0;
        state.totalCorrectAnswers = 0;
        state.totalPossiblePoints = state.questions.reduce((sum, q) => sum + q.answers.length, 0);
        updateProgress();
        showQuestion();
    } catch (error) {
        console.error("JSON 파일 로드 오류:", error);
        quizContainer.innerHTML = `
            <p class="error-message" role="alert">문제를 불러오지 못했습니다: ${error.message}</p>
            <button id="retry-load" class="action-btn" title="문제를 다시 불러옵니다">재시도</button>
            <button id="home-button" class="action-btn" title="홈으로 돌아가기">홈으로</button>
        `;
        document.getElementById("retry-load").addEventListener("click", loadQuestions);
        document.getElementById("home-button").addEventListener("click", () => window.location.href = "index.html");
        errorMessage.textContent = "퀴즈 데이터를 불러오지 못했습니다.";
        errorMessage.style.display = "block";
    }
};

// Update Progress
const updateProgress = () => {
    const percentage = state.totalPossiblePoints > 0 ? (state.score / state.totalPossiblePoints * 100).toFixed(1) : 0;
    progress.innerHTML = `
        문제 <span class="current">${state.currentQuestionIndex + 1}</span> / 
        <span class="total">${state.questions.length}</span> | 
        점수: ${state.score}/${state.totalPossiblePoints} (${percentage}%) | 
        정답 수: ${state.totalCorrectAnswers}
    `;
    progressBar.style.width = `${(state.currentQuestionIndex + 1) / state.questions.length * 100}%`;
};

// Show Question
const showQuestion = () => {
    clearTimer();
    if (state.currentQuestionIndex >= state.questions.length) {
        showFinalResult();
        return;
    }

    const q = state.questions[state.currentQuestionIndex];
    state.selectedAnswers = new Array(q.answers.length).fill(null);
    state.selectedCounts = {};
    state.answeredCorrectly = false;
    state.timeLeft = TIME_LIMIT;
    state.isPaused = false;

    const shuffledOptions = shuffleArray([...q.options]);
    quizContainer.innerHTML = `
        <p class="question-text" role="region" aria-live="polite">${q.question.replace(/___/g, (_, i) => `<span class="blank" id="blank${i}" role="button" tabindex="0" onclick="toggleBlank(${i})" onkeydown="handleBlankKeydown(event, ${i})">[선택]</span>`)}</p>
        <div class="options-container" role="listbox">
            ${shuffledOptions.map(option => `<button class="option-btn" role="option" onclick="selectAnswer('${option.replace(/'/g, "\\'")}')" onkeydown="handleOptionKeydown(event, '${option.replace(/'/g, "\\'")}')" title="${option} 선택">${option}</button>`).join('')}
        </div>
        <p class="feedback" id="feedback" role="alert"></p>
        <div class="button-group">
            <button id="pause-timer" class="pause-btn" title="타이머 일시정지" onclick="togglePause()">타이머 일시정지</button>
            <button id="reset-answers" class="reset-btn" title="선택 초기화" onclick="resetAnswers()">선택 초기화</button>
            <button id="skip-question" class="skip-btn" title="문제 건너뛰기" onclick="skipQuestion()">건너뛰기</button>
            <button id="home-button" class="action-btn" title="홈으로 돌아가기" onclick="goHome()">홈으로</button>
            <button id="show-explanation" style="display: none;" class="explanation-btn" title="정답 설명 보기" onclick="showExplanation()">설명 보기</button>
        </div>
        <div id="explanation" style="display: none; margin-top: ${10 * GOLDEN_RATIO}px; padding: ${10 * GOLDEN_RATIO}px; background: #f0f4f8; border-radius: 8px; border: 1px solid #ddd;" role="region" aria-live="polite"></div>
        <div id="timer" class="timer" role="timer">남은 시간: ${state.timeLeft}초</div>
    `;

    nextButton.style.display = "none";
    checkButton.style.display = "block";
    checkButton.disabled = false;
    startTimer();
    updateOptionButtons();
};

// Timer Functions
const startTimer = () => {
    const timerDisplay = document.getElementById("timer");
    timerDisplay.style.color = "#333";
    timerDisplay.classList.remove("paused");
    state.timer = setInterval(() => {
        if (!state.isPaused) {
            state.timeLeft--;
            timerDisplay.textContent = `남은 시간: ${state.timeLeft}초`;
            timerDisplay.style.color = state.timeLeft <= 10 ? "#dc2626" : state.timeLeft <= 20 ? "#f59e0b" : "#333";
            if (state.timeLeft <= 0) {
                clearTimer();
                checkAnswer(true);
            }
        }
    }, 1000);
};

const clearTimer = () => {
    if (state.timer) clearInterval(state.timer);
};

const togglePause = () => {
    if (state.answeredCorrectly) return;
    state.isPaused = !state.isPaused;
    const pauseButton = document.getElementById("pause-timer");
    const timerDisplay = document.getElementById("timer");
    pauseButton.textContent = state.isPaused ? "타이머 재개" : "타이머 일시정지";
    pauseButton.title = state.isPaused ? "타이머를 다시 시작" : "타이머를 일시정지";
    timerDisplay.classList.toggle("paused", state.isPaused);
    if (navigator.vibrate) navigator.vibrate(50);
    showTemporaryFeedback(state.isPaused ? "타이머가 일시정지되었습니다." : "타이머가 재개되었습니다.");
};

// Home Button Handler
const goHome = () => {
    if (confirm("홈으로 돌아가시겠습니까? 진행 상황이 저장되지 않습니다.")) {
        window.location.href = "index.html";
    }
};

// Answer Handling
const toggleBlank = index => {
    if (state.answeredCorrectly) return;
    const blank = document.getElementById(`blank${index}`);
    if (blank && state.selectedAnswers[index]) {
        const removedAnswer = state.selectedAnswers[index];
        blank.textContent = "[선택]";
        blank.classList.remove("selected");
        state.selectedAnswers[index] = null;
        state.selectedCounts[removedAnswer] = (state.selectedCounts[removedAnswer] || 1) - 1;
        if (state.selectedCounts[removedAnswer] <= 0) delete state.selectedCounts[removedAnswer];
        checkAutoCorrect();
        updateOptionButtons();
        if (navigator.vibrate) navigator.vibrate(50);
    }
};

const handleBlankKeydown = (event, index) => {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleBlank(index);
    }
};

const selectAnswer = selectedAnswer => {
    if (state.answeredCorrectly) return;
    const blanks = document.querySelectorAll(".blank");
    const existingIndex = state.selectedAnswers.indexOf(selectedAnswer);
    if (existingIndex !== -1) {
        const blank = document.getElementById(`blank${existingIndex}`);
        blank.textContent = "[선택]";
        blank.classList.remove("selected");
        state.selectedAnswers[existingIndex] = null;
        state.selectedCounts[selectedAnswer] = (state.selectedCounts[selectedAnswer] || 1) - 1;
        if (state.selectedCounts[selectedAnswer] <= 0) delete state.selectedCounts[selectedAnswer];
        checkAutoCorrect();
        updateOptionButtons();
        if (navigator.vibrate) navigator.vibrate(50);
        return;
    }

    let filled = false;
    blanks.forEach((blank, i) => {
        if (!state.selectedAnswers[i] && !filled) {
            blank.textContent = selectedAnswer;
            blank.classList.add("selected");
            state.selectedAnswers[i] = selectedAnswer;
            state.selectedCounts[selectedAnswer] = (state.selectedCounts[selectedAnswer] || 0) + 1;
            filled = true;
        }
    });

    checkAutoCorrect();
    updateOptionButtons();
    if (navigator.vibrate) navigator.vibrate(50);
};

const handleOptionKeydown = (event, option) => {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectAnswer(option);
    }
};

const updateOptionButtons = () => {
    const optionButtons = document.querySelectorAll(".option-btn");
    const blanks = document.querySelectorAll(".blank");
    const allBlanksFilled = Array.from(blanks).every(blank => blank.textContent !== "[선택]");
    
    optionButtons.forEach(btn => {
        btn.disabled = allBlanksFilled;
        btn.classList.toggle("selected-option", allBlanksFilled);
        btn.setAttribute("aria-selected", allBlanksFilled);
    });
};

const resetAnswers = () => {
    if (state.answeredCorrectly || !confirm("현재 선택을 초기화하시겠습니까?")) return;
    state.selectedAnswers = new Array(state.questions[state.currentQuestionIndex].answers.length).fill(null);
    state.selectedCounts = {};
    const blanks = document.querySelectorAll(".blank");
    blanks.forEach(blank => {
        blank.textContent = "[선택]";
        blank.classList.remove("selected");
    });
    document.getElementById("feedback").textContent = "";
    updateOptionButtons();
    showTemporaryFeedback("선택이 초기화되었습니다. 다시 시도해주세요!");
    if (navigator.vibrate) navigator.vibrate(50);
};

const skipQuestion = () => {
    if (state.answeredCorrectly || !confirm("이 문제를 건너뛰시겠습니까?")) return;
    state.currentQuestionIndex++;
    showQuestion();
    showTemporaryFeedback("문제를 건너뛰었습니다.");
    if (navigator.vibrate) navigator.vibrate(50);
};

const showTemporaryFeedback = (message, isError = false) => {
    const feedback = document.getElementById("feedback");
    feedback.textContent = message;
    feedback.className = `feedback ${isError ? "incorrect" : "info"}`;
    setTimeout(() => {
        if (feedback.textContent === message) feedback.textContent = "";
    }, FEEDBACK_DURATION);
};

// Answer Checking
const checkAutoCorrect = () => {
    const q = state.questions[state.currentQuestionIndex];
    const feedback = document.getElementById("feedback");
    const explanationBtn = document.getElementById("show-explanation");

    if (state.selectedAnswers.every(answer => answer !== null)) {
        const answerCounts = {};
        state.selectedAnswers.forEach(ans => {
            answerCounts[ans] = (answerCounts[ans] || 0) + 1;
        });
        const correctCounts = {};
        q.answers.forEach(ans => {
            correctCounts[ans] = (correctCounts[ans] || 0) + 1;
        });
        const isCorrect = Object.keys(answerCounts).every(ans => answerCounts[ans] === correctCounts[ans]) &&
                         Object.keys(correctCounts).every(ans => answerCounts[ans] === correctCounts[ans]);

        if (isCorrect) {
            const pointsEarned = q.answers.length;
            state.score += pointsEarned;
            state.totalCorrectAnswers += 1;
            feedback.textContent = `✅ 정답입니다! (+${pointsEarned}점) 다음 문제로 이동할 수 있습니다.`;
            feedback.className = "feedback correct";
            nextButton.style.display = "block";
            checkButton.style.display = "none";
            explanationBtn.style.display = "block";
            state.answeredCorrectly = true;
            clearTimer();
            updateProgress();
        } else {
            feedback.textContent = "❌ 일부 답이 틀렸습니다. 다시 시도하거나 확인 버튼을 누르세요.";
            feedback.className = "feedback incorrect";
        }
    } else {
        feedback.textContent = "";
    }
};

const checkAnswer = (isTimeout = false) => {
    const q = state.questions[state.currentQuestionIndex];
    const feedback = document.getElementById("feedback");
    const explanationBtn = document.getElementById("show-explanation");

    if (state.selectedAnswers.every(answer => answer !== null)) {
        const answerCounts = {};
        state.selectedAnswers.forEach(ans => {
            answerCounts[ans] = (answerCounts[ans] || 0) + 1;
        });
        const correctCounts = {};
        q.answers.forEach(ans => {
            correctCounts[ans] = (correctCounts[ans] || 0) + 1;
        });
        const isCorrect = Object.keys(answerCounts).every(ans => answerCounts[ans] === correctCounts[ans]) &&
                         Object.keys(correctCounts).every(ans => answerCounts[ans] === correctCounts[ans]);

        if (isCorrect) {
            const pointsEarned = q.answers.length;
            state.score += pointsEarned;
            state.totalCorrectAnswers += 1;
            feedback.textContent = `✅ 정답입니다! (+${pointsEarned}점) 계속해서 다음 문제로 이동하세요!`;
            feedback.className = "feedback correct";
            state.answeredCorrectly = true;
        } else {
            feedback.textContent = `❌ 오답입니다! 정답: ${q.answers.join(", ")}. 다시 시도하거나 설명을 확인하세요.`;
            feedback.className = "feedback incorrect";
        }
        nextButton.style.display = "block";
        checkButton.style.display = "none";
        explanationBtn.style.display = "block";
        clearTimer();
        updateProgress();
    } else if (isTimeout) {
        feedback.textContent = `⏰ 시간이 초과되었습니다! 정답: ${q.answers.join(", ")}`;
        feedback.className = "feedback incorrect";
        explanationBtn.style.display = "block";
        nextButton.style.display = "block";
        checkButton.style.display = "none";
        clearTimer();
        updateProgress();
    } else {
        showTemporaryFeedback("⚠️ 모든 빈칸을 채워주세요!", true);
    }
};

const showExplanation = () => {
    const explanationDiv = document.getElementById("explanation");
    explanationDiv.textContent = state.questions[state.currentQuestionIndex].explanation || "설명이 제공되지 않았습니다.";
    explanationDiv.style.display = "block";
    document.getElementById("show-explanation").style.display = "none";
    if (navigator.vibrate) navigator.vibrate(50);
};

// Final Result
const showFinalResult = () => {
    const percentage = state.totalPossiblePoints > 0 ? (state.score / state.totalPossiblePoints * 100).toFixed(1) : 0;
    let message = "";
    if (percentage >= 80) {
        message = "훌륭합니다! 원리강론을 깊이 이해하셨네요! 🎉";
    } else if (percentage >= 50) {
        message = "멋진 도전입니다! 조금 더 연습하면 완벽할 거예요! 💪";
    } else {
        message = "괜찮아요! 꾸준히 학습하며 다시 도전해보세요! 📚";
    }

    quizContainer.innerHTML = `
        <h2 role="alert">🎉 퀴즈 완료!</h2>
        <p>최종 점수: ${state.score} / ${state.totalPossiblePoints} (${percentage}%)</p>
        <p>맞힌 문제: ${state.totalCorrectAnswers} / ${state.questions.length}</p>
        <p class="result-message">${message}</p>
        <div class="button-group">
            <button id="restart" class="action-btn" title="퀴즈를 처음부터 다시 시작">다시 시작</button>
            <button id="home-button" class="action-btn" title="홈으로 돌아가기">홈으로</button>
            <button id="back-to-menu" class="action-btn gold" title="메인 메뉴로 돌아가기">메뉴로 돌아가기</button>
        </div>
    `;
    nextButton.style.display = "none";
    checkButton.style.display = "none";

    document.getElementById("restart").addEventListener("click", () => {
        state.currentQuestionIndex = 0;
        state.score = 0;
        state.totalCorrectAnswers = 0;
        loadQuestions();
    });
    document.getElementById("home-button").addEventListener("click", () => {
        window.location.href = "index.html";
    });
    document.getElementById("back-to-menu").addEventListener("click", () => {
        window.location.href = "index.html";
    });
};

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    loadQuestions();
    nextButton.addEventListener("click", () => {
        state.currentQuestionIndex++;
        showQuestion();
    });
    checkButton.addEventListener("click", () => checkAnswer(false));
});