document.addEventListener("DOMContentLoaded", function () {
    const quizContainer = document.getElementById("quiz-container");
    const nextButton = document.getElementById("next-question");
    const checkButton = document.getElementById("check-answer");
    const progress = document.getElementById("progress");
    let currentQuestionIndex = 0;
    let questions = [];
    let selectedAnswers = [];
    let score = 0;
    let timer;
    const timeLimit = 60; // 초 단위
    let answeredCorrectly = false; // 정답 여부 추적

    // JSON 파일 로드
    fetch("assets/data/divine_pr.json")
        .then(response => response.json())
        .then(data => {
            questions = data;
            updateProgress();
            showQuestion();
        })
        .catch(error => {
            console.error("JSON 파일을 불러오는 중 오류 발생:", error);
            quizContainer.innerHTML = "<p>문제를 불러오는 데 실패했습니다. 다시 시도해주세요.</p>";
        });

    // 배열을 무작위로 섞는 함수 (Fisher-Yates Shuffle)
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

        selectedAnswers = new Array(questions[currentQuestionIndex].answers.length).fill(null);
        answeredCorrectly = false;
        const q = questions[currentQuestionIndex];
        const shuffledOptions = shuffleArray([...q.options]);

        let questionHTML = `
            <p class="question-text">${q.question.replace(/___/g, (_, i) => `<span class="blank" id="blank${i}" onclick="toggleBlank(${i})">[선택]</span>`)}</p>
            <div class="options-container">
                ${shuffledOptions.map(option => `<button class="option-btn" onclick="selectAnswer('${option}')">${option}</button>`).join('')}
            </div>
            <p class="feedback" id="feedback"></p>
            <button id="show-explanation" style="display: none;" class="explanation-btn">설명 보기</button>
            <div id="explanation" style="display: none; margin-top: 15px; padding: 10px; background: #f9f9f9; border-radius: 8px;"></div>
            <div id="timer" class="timer">남은 시간: ${timeLimit}초</div>
        `;

        quizContainer.innerHTML = questionHTML;
        nextButton.style.display = "none";
        checkButton.style.display = "block";
        checkButton.disabled = false;
        startTimer();
        updateProgress();
        updateOptionButtons(); // 선택지 버튼 상태 초기화
    }

    // 진행 상황 업데이트
    function updateProgress() {
        progress.innerHTML = `문제 <span class="current">${currentQuestionIndex + 1}</span> / <span class="total">${questions.length}</span> | 점수: ${score}`;
    }

    // 타이머 설정
    function startTimer() {
        let timeLeft = timeLimit;
        const timerDisplay = document.getElementById("timer");
        timerDisplay.style.color = "#333";
        timer = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = `남은 시간: ${timeLeft}초`;
            if (timeLeft <= 10) timerDisplay.style.color = "red"; // 10초 남으면 빨간색으로
            if (timeLeft <= 0) {
                clearTimer();
                checkAnswer(true);
            }
        }, 1000);
    }

    function clearTimer() {
        if (timer) clearInterval(timer);
    }

    // 빈칸 클릭 시 선택 취소
    window.toggleBlank = function (index) {
        if (answeredCorrectly) return; // 정답 맞춘 후에는 수정 불가
        const blank = document.getElementById(`blank${index}`);
        if (selectedAnswers[index]) {
            blank.textContent = "[선택]";
            blank.classList.remove("selected");
            selectedAnswers[index] = null;
            checkAutoCorrect();
            updateOptionButtons();
        }
    };

    // 선택한 답을 빈칸에 채우거나 제거
    window.selectAnswer = function (selectedAnswer) {
        if (answeredCorrectly) return; // 정답 맞춘 후에는 수정 불가
        const blanks = document.querySelectorAll(".blank");

        // 이미 선택된 단어인지 확인하고 제거
        const existingIndex = selectedAnswers.indexOf(selectedAnswer);
        if (existingIndex !== -1) {
            const blank = document.getElementById(`blank${existingIndex}`);
            blank.textContent = "[선택]";
            blank.classList.remove("selected");
            selectedAnswers[existingIndex] = null;
            checkAutoCorrect();
            updateOptionButtons();
            return;
        }

        // 빈칸에 채우기
        let filled = false;
        blanks.forEach((blank, i) => {
            if (!selectedAnswers[i] && !filled) {
                blank.textContent = selectedAnswer;
                blank.classList.add("selected");
                selectedAnswers[i] = selectedAnswer;
                filled = true;
            }
        });

        checkAutoCorrect();
        updateOptionButtons();
    };

    // 선택지 버튼 상태 업데이트
    function updateOptionButtons() {
        const optionButtons = document.querySelectorAll(".option-btn");
        optionButtons.forEach(btn => {
            const optionText = btn.textContent;
            if (selectedAnswers.includes(optionText)) {
                btn.classList.add("selected-option");
                btn.disabled = true;
            } else {
                btn.classList.remove("selected-option");
                btn.disabled = false;
            }
        });
    }

    // 자동 정답 확인 및 피드백
    function checkAutoCorrect() {
        const q = questions[currentQuestionIndex];
        const feedback = document.getElementById("feedback");
        const explanationBtn = document.getElementById("show-explanation");

        if (selectedAnswers.every(answer => answer !== null)) {
            let isCorrect = selectedAnswers.every((answer, i) => answer === q.answers[i]);

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
            let isCorrect = selectedAnswers.every((answer, i) => answer === q.answers[i]);

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
                nextButton.style.display = "block"; // 오답이어도 다음으로 이동 가능
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

    // 설명 보기 함수
    quizContainer.addEventListener("click", (e) => {
        if (e.target.id === "show-explanation") {
            const explanationDiv = document.getElementById("explanation");
            explanationDiv.textContent = questions[currentQuestionIndex].explanation;
            explanationDiv.style.display = "block";
            e.target.style.display = "none";
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
            <button id="restart" class="action-btn">다시 시작</button>
            <button id="back-to-menu" class="action-btn gold">메뉴로 돌아가기</button>
        `;
        nextButton.style.display = "none";
        checkButton.style.display = "none";

        document.getElementById("restart").addEventListener("click", () => {
            currentQuestionIndex = 0;
            score = 0;
            showQuestion();
        });
        document.getElementById("back-to-menu").addEventListener("click", () => {
            window.location.href = "index.html"; // 메인 페이지로 이동
        });
    }

    nextButton.addEventListener("click", nextQuestion);
    checkButton.addEventListener("click", () => checkAnswer(false));
});