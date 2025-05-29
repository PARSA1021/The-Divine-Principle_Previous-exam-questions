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

    document.getElementById('quiz-container').innerHTML = `
        <div class="question">${questionWithBlanks}</div>
        <div class="options">
            ${shuffledOptions.map(a => `
                <button class="option-btn" onclick="selectAnswer('${a.replace(/'/g, "\\'")}')" title="이 선택지를 빈칸에 추가">${a}</button>
            `).join('')}
        </div>
        <div class="button-group">
            <button id="reset-answers" class="reset-btn" onclick="resetAnswers()" title="현재 문제의 선택을 초기화">선택 초기화</button>
        </div>
        <div id="result" class="result"></div>
        <div id="explanation" class="explanation" style="display: none;"></div>
    `;
    document.getElementById('result').innerHTML = '';
    document.getElementById('explanation').style.display = 'none';
    document.getElementById('next-btn').disabled = true;
    updateProgress();
    updateOptionButtons();
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

    // Deselect if already selected
    const existingIndex = selectedAnswers.indexOf(answer);
    if (existingIndex !== -1) {
        const blank = document.getElementById(`blank${existingIndex}`);
        blank.textContent = "[선택]";
        blank.classList.remove("selected");
        selectedAnswers[existingIndex] = null;
        selectedCounts[answer] = (selectedCounts[answer] || 1) - 1;
        if (selectedCounts[answer] <= 0) delete selectedCounts[answer];
        checkAnswers();
        updateOptionButtons();
        return;
    }

    // Add new answer to first empty blank
    let filled = false;
    blanks.forEach((blank, i) => {
        if (!selectedAnswers[i] && !filled) {
            blank.textContent = answer;
            blank.classList.add("selected");
            selectedAnswers[i] = answer;
            selectedCounts[answer] = (selectedCounts[answer] || 0) + 1;
            filled = true;
        }
    });

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
            resultDiv.textContent = "✅ 정답입니다! 다음 문제로 이동할 수 있습니다.";
            resultDiv.className = "result correct";
            explanationDiv.innerHTML = q.explanation;
            explanationDiv.style.display = "block";
            score += 10;
            document.getElementById('next-btn').disabled = false;
        } else {
            resultDiv.textContent = `❌ 오답입니다! 정답: ${q.answers.join(", ")}`;
            resultDiv.className = "result incorrect";
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