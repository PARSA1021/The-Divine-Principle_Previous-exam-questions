let qnaData = [];

async function fetchQnA() {
  const response = await fetch('qna_data.json');
  qnaData = await response.json();
  renderQnA(); // 초기 전체 렌더링
}

function renderQnA(filter = "전체") {
  const list = document.getElementById("qna-list");
  const filtered = filter === "전체" ? qnaData : qnaData.filter(q => q.category === filter);

  list.innerHTML = filtered.map(q => `
    <div class="qna-card">
      <div class="question"><i class="fas fa-question-circle"></i> ${q.question}</div>
      <div class="answer"><i class="fas fa-comment-dots"></i> ${q.answer}</div>
      <div class="category-label">${q.category}</div>
    </div>
  `).join('');
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
