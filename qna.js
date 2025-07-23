let qnaData = [];

async function fetchQnA() {
  try {
    const response = await fetch('qna_data.json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    qnaData = await response.json();
    renderQnA();
  } catch (error) {
    console.error('Failed to fetch Q&A data:', error);
    document.getElementById('qna-list').innerHTML = '<p class="error">질문 데이터를 불러오지 못했습니다. 나중에 다시 시도해주세요.</p>';
  }
}

function renderQnA(filter = "전체") {
  const list = document.getElementById("qna-list");
  const filtered = filter === "전체" ? qnaData : qnaData.filter(q => q.category === filter);

  list.innerHTML = filtered.map((q) => `
    <div class="qna-card" aria-expanded="false" data-answer="${q.answer.replace(/"/g, '"')}">
      <div class="question" role="button" tabindex="0" aria-label="질문 펼치기: ${q.question}">
        <i class="fas fa-question-circle"></i> ${q.question}
      </div>
      <div class="answer"><i class="fas fa-comment-dots"></i> ${q.answer}</div>
      <div class="category-label">${q.category}</div>
    </div>
  `).join('');

  // Add click and keypress event listeners for collapsing/expanding
  list.querySelectorAll('.qna-card .question').forEach(question => {
    question.addEventListener('click', toggleAnswer);
    question.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleAnswer(e);
      }
    });
  });
}

function toggleAnswer(event) {
  const card = event.target.closest('.qna-card');
  const isExpanded = card.getAttribute('aria-expanded') === 'true';
  card.setAttribute('aria-expanded', !isExpanded);
}

document.addEventListener('DOMContentLoaded', () => {
  fetchQnA();

  document.querySelectorAll('.qna-filter button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.qna-filter button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderQnA(btn.dataset.category);
    });
  });
});