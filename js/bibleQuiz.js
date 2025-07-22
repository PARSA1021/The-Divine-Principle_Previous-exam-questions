let questions = [];
let currentQuestionIndex = 0;
let selectedAnswers = [];
let selectedCounts = {}; // Track count of each selected option
let score = 0;
let isListMode = false;

async function loadQuestions() {
    document.getElementById('loading').style.display = 'flex';
    document.getElementById('quiz-container').style.display = 'none';
    try {
        const response = await fetch('assets/data/bible_rp.json', { cache: 'force-cache' });
        if (!response.ok) {
            throw new Error(`HTTP 오류! 상태: ${response.status} - ${response.statusText}`);
        }
        questions = await response.json();
        questions = shuffleArray([...questions]);
        updateProgress();
        loadQuestion();
    } catch (error) {
        console.error('JSON 로드 실패:', error);
        document.getElementById('quiz-container').innerHTML = `
            <p class="error-message">문제를 불러오는 데 실패했습니다: ${error.message}</p>
            <button onclick="loadQuestions()" class="action-btn" title="문제를 다시 불러옵니다">재시도</button>
        `;
    } finally {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('quiz-container').style.display = 'block';
    }
}

function updateProgress() {
    document.getElementById('progress-text').textContent = `진행률: ${currentQuestionIndex + 1}/${questions.length}`;
    document.getElementById('score-text').textContent = `점수: ${score}`;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function loadQuestion() {
    if (isListMode) {
        displayQuestionList();
        return;
    }
    const q = questions[currentQuestionIndex];
    const questionWithBlanks = q.question.replace(/___/g, (_, i) => `<span class="blank" id="blank${i}" onclick="toggleBlank(${i})">[선택]</span>`);
    const shuffledOptions = shuffleArray([...q.options]);
    selectedAnswers = new Array(q.answers.length).fill(null);
    selectedCounts = {};

    // Fade out animation before changing content
    const quizContainer = document.getElementById('quiz-container');
    quizContainer.style.opacity = 1;
    quizContainer.style.transition = 'opacity 0.35s';
    quizContainer.style.opacity = 0;
    setTimeout(() => {
        quizContainer.innerHTML = `
            <div class="question-text">${questionWithBlanks}</div>
            <div class="options-container">
                ${shuffledOptions.map((a, i) => `
                    <div class="option-btn">
                        <input type="checkbox" name="answer" id="option${i}" value="${a.replace(/'/g, "\\'")}" style="display:none;">
                        <label for="option${i}" style="width:100%;height:100%;display:block;cursor:pointer;">${a}</label>
                    </div>
                `).join('')}
            </div>
            <div class="button-group">
                <button id="reset-answers" class="reset-btn" onclick="resetAnswers()" title="현재 문제의 선택을 초기화">선택 초기화</button>
            </div>
            <div id="result" class="feedback"></div>
            <div id="explanation" class="explanation" style="display: none;"></div>
        `;
        document.getElementById('result').innerHTML = '';
        document.getElementById('explanation').style.display = 'none';
        document.getElementById('next-btn').disabled = true;
        updateProgress();
        updateOptionButtons();

        // 옵션 클릭 이벤트 (체크박스 숨기고 라벨 전체 클릭)
        document.querySelectorAll('.option-btn').forEach((optionDiv, i) => {
            const checkbox = optionDiv.querySelector('input');
            const label = optionDiv.querySelector('label');
            optionDiv.addEventListener('click', (e) => {
                if (e.target.tagName !== "INPUT") {
                    checkbox.checked = !checkbox.checked;
                }
                optionDiv.classList.toggle("selected", checkbox.checked);
                selectAnswer(label.textContent);
            });
            checkbox.addEventListener('change', () => {
                optionDiv.classList.toggle("selected", checkbox.checked);
                selectAnswer(label.textContent);
            });
        });

        // Fade in after content change
        setTimeout(() => {
            quizContainer.style.opacity = 1;
        }, 30);
        // Scroll quiz container into view for all devices
        setTimeout(() => {
            quizContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            quizContainer.focus && quizContainer.focus();
        }, 100);
    }, 350);
}

function displayQuestionList() {
    document.getElementById('quiz-container').innerHTML = `
        <h2>문제 목록</h2>
        <ul class="question-list">
            ${questions.map((q, index) => `
                <li onclick="selectQuestion(${index})" title="이 문제를 풀기">${q.question}</li>
            `).join('')}
        </ul>
    `;
    document.getElementById('result').innerHTML = '';
    document.getElementById('explanation').style.display = 'none';
    document.getElementById('next-btn').disabled = true;
}

function selectQuestion(index) {
    currentQuestionIndex = index;
    isListMode = false;
    loadQuestion();
}

function toggleBlank(index) {
    if (document.getElementById('next-btn').disabled === false) return;
    const blank = document.getElementById(`blank${index}`);
    if (blank && selectedAnswers[index]) {
        const removedAnswer = selectedAnswers[index];
        blank.textContent = "[선택]";
        blank.classList.remove("selected");
        selectedAnswers[index] = null;
        selectedCounts[removedAnswer] = (selectedCounts[removedAnswer] || 1) - 1;
        if (selectedCounts[removedAnswer] <= 0) delete selectedCounts[removedAnswer];
        checkAnswers();
        updateOptionButtons();
    }
}

function selectAnswer(answer) {
    if (document.getElementById('next-btn').disabled === false) return;
    const blanks = document.querySelectorAll('.blank');

    // If already selected, remove it and shift left all answers after it
    const existingIndex = selectedAnswers.indexOf(answer);
    if (existingIndex !== -1) {
        // Remove the answer and shift left
        for (let i = existingIndex; i < selectedAnswers.length - 1; i++) {
            selectedAnswers[i] = selectedAnswers[i + 1];
            const nextBlank = document.getElementById(`blank${i}`);
            if (selectedAnswers[i]) {
                nextBlank.textContent = selectedAnswers[i];
                nextBlank.classList.add("selected");
            } else {
                nextBlank.textContent = "[선택]";
                nextBlank.classList.remove("selected");
            }
        }
        // Clear the last blank
        selectedAnswers[selectedAnswers.length - 1] = null;
        const lastBlank = document.getElementById(`blank${selectedAnswers.length - 1}`);
        lastBlank.textContent = "[선택]";
        lastBlank.classList.remove("selected");
        selectedCounts[answer] = (selectedCounts[answer] || 1) - 1;
        if (selectedCounts[answer] <= 0) delete selectedCounts[answer];
        checkAnswers();
        updateOptionButtons();
        return;
    }

    // Add new answer to first empty blank (left to right)
    for (let i = 0; i < selectedAnswers.length; i++) {
        if (!selectedAnswers[i]) {
            selectedAnswers[i] = answer;
            const blank = document.getElementById(`blank${i}`);
            blank.textContent = answer;
            blank.classList.add("selected");
            selectedCounts[answer] = (selectedCounts[answer] || 0) + 1;
            break;
        }
    }
    checkAnswers();
    updateOptionButtons();
}

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

function resetAnswers() {
    if (document.getElementById('next-btn').disabled === false) return;
    if (confirm("현재 문제의 선택을 초기화하시겠습니까?")) {
        selectedAnswers = new Array(questions[currentQuestionIndex].answers.length).fill(null);
        selectedCounts = {};
        const blanks = document.querySelectorAll(".blank");
        blanks.forEach(blank => {
            blank.textContent = "[선택]";
            blank.classList.remove("selected");
        });
        document.getElementById('result').textContent = "";
        document.getElementById('explanation').style.display = "none";
        updateOptionButtons();
    }
}

function checkAnswers() {
    const q = questions[currentQuestionIndex];
    const resultDiv = document.getElementById('result');
    const explanationDiv = document.getElementById('explanation');

    if (selectedAnswers.every(answer => answer !== null)) {
        // 순서까지 완전히 일치해야 정답
        const isCorrect = selectedAnswers.length === q.answers.length &&
            selectedAnswers.every((ans, idx) => ans === q.answers[idx]);

        if (isCorrect) {
            resultDiv.textContent = "✅ 정답입니다! 다음 문제로 이동할 수 있습니다.";
            resultDiv.className = "feedback correct";
            explanationDiv.innerHTML = q.explanation;
            explanationDiv.style.display = "block";
            score += 10;
            document.getElementById('next-btn').disabled = false;
        } else {
            resultDiv.textContent = `❌ 오답입니다! (정답 순서: ${q.answers.join(", ")})`;
            resultDiv.className = "feedback incorrect";
            explanationDiv.innerHTML = q.explanation;
            explanationDiv.style.display = "block";
            document.getElementById('next-btn').disabled = false;
        }
        updateProgress();
    } else {
        resultDiv.textContent = "";
        explanationDiv.style.display = "none";
    }
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
        loadQuestion();
    } else {
        alert(`🎉 모든 문제를 풀었습니다! 최종 점수: ${score}`);
        currentQuestionIndex = 0;
        score = 0;
        loadQuestion();
    }
}

function toggleListMode() {
    isListMode = !isListMode;
    if (isListMode) {
        displayQuestionList();
    } else {
        loadQuestion();
    }
    document.getElementById('list-btn').textContent = isListMode ? '퀴즈 모드' : '문제 목록';
    document.getElementById('list-btn').title = isListMode ? '퀴즈 모드로 전환' : '문제 목록 보기';
}

window.onload = loadQuestions;