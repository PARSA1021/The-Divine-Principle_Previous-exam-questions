let questions = [];
let currentQuestionIndex = 0;
let selectedAnswers = [];
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
        updateProgress();
        loadQuestion();
    } catch (error) {
        console.error('JSON 로드 실패:', error);
        document.getElementById('quiz-container').innerHTML = `
            <p>문제를 불러오는 데 실패했습니다: ${error.message}. <button onclick="loadQuestions()">재시도</button></p>
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
    const questionWithBlanks = q.question.replace(/___/g, '<span class="blank">___</span>');
    const shuffledOptions = shuffleArray([...q.options]);
    
    document.getElementById('quiz-container').innerHTML = `
        <div class="question">${questionWithBlanks}</div>
        <div class="options">${shuffledOptions.map(a => `
            <button class="option-btn" onclick="selectAnswer('${a}')">${a}</button>
        `).join('')}</div>
    `;
    selectedAnswers = [];
    document.getElementById('result').innerHTML = '';
    document.getElementById('explanation').style.display = 'none';
    document.getElementById('next-btn').disabled = true;
    updateProgress();
}

function displayQuestionList() {
    document.getElementById('quiz-container').innerHTML = `
        <h2>문제 목록</h2>
        <ul class="question-list">
            ${questions.map((q, index) => `
                <li onclick="selectQuestion(${index})">${q.question}</li>
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

function selectAnswer(answer) {
    const blanks = document.querySelectorAll('.blank');
    
    if (selectedAnswers.length < 2 && !selectedAnswers.includes(answer)) {
        selectedAnswers.push(answer);
        if (selectedAnswers.length <= blanks.length) {
            blanks[selectedAnswers.length - 1].textContent = answer;
        }
        document.querySelectorAll('.option-btn').forEach(btn => {
            if (btn.textContent === answer) btn.classList.add('selected');
        });

        // 두 개 모두 선택되었을 때 즉시 확인
        if (selectedAnswers.length === 2) {
            const q = questions[currentQuestionIndex];
            const correct = q.answers.every(a => selectedAnswers.includes(a)) && selectedAnswers.every(a => q.answers.includes(a));
            document.getElementById('result').innerHTML = correct ? '정답입니다!' : '틀렸습니다.';
            document.getElementById('explanation').innerHTML = q.explanation;
            document.getElementById('explanation').style.display = 'block';
            
            // 버튼 비활성화 및 점수 업데이트
            document.querySelectorAll('.option-btn').forEach(btn => btn.disabled = true);
            if (correct) {
                score += 10;
                document.getElementById('next-btn').disabled = false;
            }
            updateProgress();
        }
    } else if (selectedAnswers.includes(answer)) {
        const index = selectedAnswers.indexOf(answer);
        selectedAnswers.splice(index, 1);
        blanks.forEach((blank, i) => {
            blank.textContent = i < selectedAnswers.length ? selectedAnswers[i] : '___';
        });
        document.querySelectorAll('.option-btn').forEach(btn => {
            if (btn.textContent === answer) btn.classList.remove('selected');
        });
        document.getElementById('result').innerHTML = '';
        document.getElementById('explanation').style.display = 'none';
    }
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
        loadQuestion();
    } else {
        alert(`모든 문제를 풀었습니다! 최종 점수: ${score}`);
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
}

window.onload = loadQuestions;