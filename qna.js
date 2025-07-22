let qnaData = [];

async function fetchQnA() {
  const response = await fetch('qna_data.json');
  qnaData = await response.json();
  renderQnA(); // 초기 전체 렌더링
}

function renderQnA(filter = "전체") {
  const list = document.getElementById("qna-list");
  const filtered = filter === "전체" ? qnaData : qnaData.filter(q => q.category === filter);

  list.innerHTML = filtered.map((q, idx) => `
    <div class="qna-card" data-answer="${q.answer.replace(/"/g, '&quot;')}">
      <div class="question"><i class="fas fa-question-circle"></i> ${q.question}</div>
      <div class="answer"><i class="fas fa-comment-dots"></i> ${q.answer}</div>
      <div class="category-label">${q.category}</div>
      <button class="copy-answer-btn" aria-label="답변 복사" title="답변 복사" data-idx="${idx}"><i class="fas fa-copy"></i></button>
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

  // Event delegation for copy answer button
  document.getElementById('qna-list').addEventListener('click', function(e) {
    if (e.target.closest('.copy-answer-btn')) {
      const card = e.target.closest('.qna-card');
      const answer = card.getAttribute('data-answer');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(answer);
      } else {
        // fallback
        const temp = document.createElement('textarea');
        temp.value = answer;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }
      e.target.closest('.copy-answer-btn').classList.add('copied');
      setTimeout(() => {
        e.target.closest('.copy-answer-btn').classList.remove('copied');
      }, 700);
    }
  });
});
