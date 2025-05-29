document.addEventListener("DOMContentLoaded", function () {
    const quizContainer = document.getElementById("quiz-container");
    const nextButton = document.getElementById("next-question");
    const checkButton = document.getElementById("check-answer");
    const progress = document.getElementById("progress");
    let currentQuestionIndex = 0;
    let questions = [];
    let selectedAnswers = [];
    let selectedCounts = {}; // Track count of each selected option
    let score = 0;
    let timer;
    let timeLeft = 60;
    const timeLimit = 60;
    let answeredCorrectly = false;
    let isPaused = false;

    // JSON 파일 로드
    function loadQuestions() {
        fetch("assets/data/divine_pr.json")
            .then(response => response.json())
            .then(data => {
                questions = shuffleArray([...data]);
                updateProgress();
                showQuestion();
            })
            .catch(error => {
                console.error("JSON 파일을 불러오는 중 오류 발생:", error);
                quizContainer.innerHTML = `
                    <p class="error-message">문제를 불러오는 데 실패했습니다.</p>
                    <button id="retry-load" class="action-btn" title="문제를 다시 불러옵니다">재시도</button>
                `;
                document.getElementById("retry-load").addEventListener("click", loadQuestions);
            });
    }
    loadQuestions();

    // 배열을 무작위로 섞는 함수
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // 문제 표시 함수
    function showQuestion() {
        clearTimer();
        if (currentQuestionIndex >= questions.length) {
            showFinalResult();
            return;
        }

        const q = questions[currentQuestionIndex];
        selectedAnswers = new Array(q.answers.length).fill(null);
        selectedCounts = {}; // Reset selection counts
        answeredCorrectly = false;
        timeLeft = timeLimit;
        const shuffledOptions = shuffleArray([...q.options]);

        let questionHTML = `
            <p class="question-text">${q.question.replace(/___/g, (_, i) => `<span class="blank" id="blank${i}" onclick="toggleBlank(${i})">[선택]</span>`)}</p>
            <div class="options-container">
                ${shuffledOptions.map(option => `<button class="option-btn" onclick="selectAnswer('${option.replace(/'/g, "\\'")}')" title="이 선택지를 빈칸에 추가">${option}</button>`).join('')}
            </div>
            <p class="feedback" id="feedback"></p>
            <div class="button-group">
                <button id="pause-timer" class="pause-btn" title="타이머를 일시정지 또는 재개">${isPaused ? "타이머 재개" : "타이머 일시정지"}</button>
                <button id="reset-answers" class="reset-btn" title="현재 문제의 선택을 초기화">선택 초기화</button>
                <button id="show-explanation" style="display: none;" class="explanation-btn" title="정답 설명 보기">설명 보기</button>
            </div>
            <div id="explanation" style="display: none; margin-top: 15px; padding: 15px; background: #f0f4f8; border-radius: 8px; border: 1px solid #ddd;"></div>
            <div id="timer" class="timer">남은 시간: ${timeLeft}초</div>
        `;

        quizContainer.innerHTML = questionHTML;
        nextButton.style.display = "none";
        checkButton.style.display = "block";
        checkButton.disabled = false;
        startTimer();
        updateProgress();
        updateOptionButtons();
    }

    // 진행 상황 업데이트
    function updateProgress() {
        progress.innerHTML = `문제 <span class="current">${currentQuestionIndex + 1}</span> / <span class="total">${questions.length}</span> | 점수: ${score}`;
    }

    // 타이머 설정
    function startTimer() {
        const timerDisplay = document.getElementById("timer");
        timerDisplay.style.color = "#333";
        timerDisplay.classList.remove("paused");
        timer = setInterval(() => {
            if (!isPaused) {
                timeLeft--;
                timerDisplay.textContent = `남은 시간: ${timeLeft}초`;
                if (timeLeft <= 10) timerDisplay.style.color = "red";
                if (timeLeft <= 0) {
                    clearTimer();
                    checkAnswer(true);
                }
            }
        }, 1000);
    }

    function clearTimer() {
        if (timer) clearInterval(timer);
    }

    // 타이머 일시정지/재개
    window.togglePause = function () {
        const pauseButton = document.getElementById("pause-timer");
        const timerDisplay = document.getElementById("timer");
        isPaused = !isPaused;
        pauseButton.textContent = isPaused ? "타이머 재개" : "타이머 일시정지";
        pauseButton.title = isPaused ? "타이머를 다시 시작" : "타이머를 일시정지";
        timerDisplay.classList.toggle("paused", isPaused);
    };

    // 빈칸 클릭 시 선택 취소
    window.toggleBlank = function (index) {
        if (answeredCorrectly) return;
        const blank = document.getElementById(`blank${index}`);
        if (blank && selectedAnswers[index]) {
            const removedAnswer = selectedAnswers[index];
            blank.textContent = "[선택]";
            blank.classList.remove("selected");
            selectedAnswers[index] = null;
            selectedCounts[removedAnswer] = (selectedCounts[removedAnswer] || 1) - 1;
            if (selectedCounts[removedAnswer] <= 0) delete selectedCounts[removedAnswer];
            checkAutoCorrect();
            updateOptionButtons();
        }
    };

    // 선택한 답을 빈칸에 채우거나 제거
    window.selectAnswer = function (selectedAnswer) {
        if (answeredCorrectly) return;
        const blanks = document.querySelectorAll(".blank");

        // Check if answer is already selected and remove it
        const existingIndex = selectedAnswers.indexOf(selectedAnswer);
        if (existingIndex !== -1) {
            const blank = document.getElementById(`blank${existingIndex}`);
            blank.textContent = "[선택]";
            blank.classList.remove("selected");
            selectedAnswers[existingIndex] = null;
            selectedCounts[selectedAnswer] = (selectedCounts[selectedAnswer] || 1) - 1;
            if (selectedCounts[selectedAnswer] <= 0) delete selectedCounts[selectedAnswer];
            checkAutoCorrect();
            updateOptionButtons();
            return;
        }

        // Add new answer to first empty blank
        let filled = false;
        blanks.forEach((blank, i) => {
            if (!selectedAnswers[i] && !filled) {
                blank.textContent = selectedAnswer;
                blank.classList.add("selected");
                selectedAnswers[i] = selectedAnswer;
                selectedCounts[selectedAnswer] = (selectedCounts[selectedAnswer] || 0) + 1;
                filled = true;
            }
        });

        checkAutoCorrect();
        updateOptionButtons();
    };

    // 선택지 버튼 상태 업데이트
    function updateOptionButtons() {
        const q = questions[currentQuestionIndex];
        const optionButtons = document.querySelectorAll(".option-btn");
        optionButtons.forEach(btn => {
            const optionText = btn.textContent;
            const maxAllowed = q.answers.filter(ans => ans === optionText).length;
            const currentCount = selectedCounts[optionText] || 0;
            if (currentCount >= maxAllowed) {
                btn.classList.add("selected-option");
                btn.disabled = true;
            } else {
                btn.classList.remove("selected-option");
                btn.disabled = false;
            }
        });
    }

    // 선택 초기화
    window.resetAnswers = function () {
        if (answeredCorrectly) return;
        if (confirm("현재 문제의 선택을 초기화하시겠습니까?")) {
            selectedAnswers = new Array(questions[currentQuestionIndex].answers.length).fill(null);
            selectedCounts = {};
            const blanks = document.querySelectorAll(".blank");
            blanks.forEach(blank => {
                blank.textContent = "[선택]";
                blank.classList.remove("selected");
            });
            const feedback = document.getElementById("feedback");
            feedback.textContent = "";
            updateOptionButtons();
        }
    };

    // 자동 정답 확인 및 피드백
    function checkAutoCorrect() {
        const q = questions[currentQuestionIndex];
        const feedback = document.getElementById("feedback");
        const explanationBtn = document.getElementById("show-explanation");

        if (selectedAnswers.every(answer => answer !== null)) {
            const answerCounts = {};
            selectedAnswers.forEach(ans => {
                answerCounts[ans] = (answerCounts[ans] || 0) + 1;
            });
            const correctCounts = {};
            q.answers.forEach(ans => {
                correctCounts[ans] = (correctCounts[ans] || 0) + 1;
            });
            const isCorrect = Object.keys(answerCounts).every(ans => answerCounts[ans] === correctCounts[ans]) &&
                             Object.keys(correctCounts).every(ans => answerCounts[ans] === correctCounts[ans]);

            if (isCorrect) {
                feedback.textContent = "✅ 정답입니다! 다음 문제로 이동할 수 있습니다.";
                feedback.className = "feedback correct";
                nextButton.style.display = "block";
                checkButton.style.display = "none";
                explanationBtn.style.display = "block";
                score++;
                answeredCorrectly = true;
                clearTimer();
                updateProgress();
            } else {
                feedback.textContent = "❌ 일부 답이 틀렸습니다. 다시 시도하거나 확인 버튼을 누르세요.";
                feedback.className = "feedback incorrect";
            }
        } else {
            feedback.textContent = "";
        }
    }

    // 수동 정답 확인 함수
    window.checkAnswer = function (isTimeout = false) {
        const q = questions[currentQuestionIndex];
        const feedback = document.getElementById("feedback");
        const explanationBtn = document.getElementById("show-explanation");

        if (selectedAnswers.every(answer => answer !== null)) {
            const answerCounts = {};
            selectedAnswers.forEach(ans => {
                answerCounts[ans] = (answerCounts[ans] || 0) + 1;
            });
            const correctCounts = {};
            q.answers.forEach(ans => {
                correctCounts[ans] = (correctCounts[ans] || 0) + 1;
            });
            const isCorrect = Object.keys(answerCounts).every(ans => answerCounts[ans] === correctCounts[ans]) &&
                             Object.keys(correctCounts).every(ans => answerCounts[ans] === correctCounts[ans]);

            if (isCorrect) {
                feedback.textContent = "✅ 정답입니다! 다음 문제로 이동할 수 있습니다.";
                feedback.className = "feedback correct";
                nextButton.style.display = "block";
                checkButton.style.display = "none";
                explanationBtn.style.display = "block";
                score++;
                answeredCorrectly = true;
            } else {
                feedback.textContent = `❌ 오답입니다! 정답: ${q.answers.join(", ")}`;
                feedback.className = "feedback incorrect";
                explanationBtn.style.display = "block";
                nextButton.style.display = "block";
            }
            clearTimer();
            updateProgress();
        } else if (isTimeout) {
            feedback.textContent = `⏰ 시간이 초과되었습니다! 정답: ${q.answers.join(", ")}`;
            feedback.className = "feedback incorrect";
            explanationBtn.style.display = "block";
            nextButton.style.display = "block";
            checkButton.style.display = "none";
        } else {
            feedback.textContent = "⚠️ 모든 빈칸을 채워주세요!";
            feedback.className = "feedback warning";
        }
    };

    // 이벤트 리스너 설정
    quizContainer.addEventListener("click", (e) => {
        if (e.target.id === "show-explanation") {
            const explanationDiv = document.getElementById("explanation");
            explanationDiv.textContent = questions[currentQuestionIndex].explanation;
            explanationDiv.style.display = "block";
            e.target.style.display = "none";
        } else if (e.target.id === "pause-timer") {
            togglePause();
        } else if (e.target.id === "reset-answers") {
            resetAnswers();
        }
    });

    // 다음 문제로 이동
    function nextQuestion() {
        currentQuestionIndex++;
        showQuestion();
    }

    // 퀴즈 종료 시 결과 표시
    function showFinalResult() {
        const percentage = (score / questions.length) * 100;
        let message = "";
        if (percentage >= 80) {
            message = "훌륭합니다! 원리강론을 잘 이해하고 계시네요! 🎉";
        } else if (percentage >= 50) {
            message = "좋은 시도였습니다. 조금 더 연습하면 완벽해질 거예요! 💪";
        } else {
            message = "괜찮아요! 다시 도전해보세요. 학습은 꾸준함이 중요합니다! 📚";
        }

        quizContainer.innerHTML = `
            <h2>🎉 퀴즈 완료!</h2>
            <p>최종 점수: ${score} / ${questions.length} (${percentage.toFixed(1)}%)</p>
            <p class="result-message">${message}</p>
            <div class="button-group">
                <button id="restart" class="action-btn" title="퀴즈를 처음부터 다시 시작">다시 시작</button>
                <button id="back-to-menu" class="action-btn gold" title="메인 메뉴로 돌아가기">메뉴로 돌아가기</button>
            </div>
        `;
        nextButton.style.display = "none";
        checkButton.style.display = "none";

        document.getElementById("restart").addEventListener("click", () => {
            currentQuestionIndex = 0;
            score = 0;
            loadQuestions();
        });
        document.getElementById("back-to-menu").addEventListener("click", () => {
            window.location.href = "index.html";
        });
    }

    nextButton.addEventListener("click", nextQuestion);
    checkButton.addEventListener("click", () => checkAnswer(false));
});