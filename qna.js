let qnaData = [];
let currentPage = 1;
const itemsPerPage = 10;

async function fetchQnA() {
  try {
    document.getElementById('qna-list').innerHTML = '<p class="loading">로딩 중...</p>';
    const response = await fetch('qna_data.json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    qnaData = await response.json();
    if (!Array.isArray(qnaData) || qnaData.length === 0) {
      throw new Error('질문 데이터가 비어 있습니다.');
    }
    renderQnA();
  } catch (error) {
    console.error('Failed to fetch Q&A data:', error);
    document.getElementById('qna-list').innerHTML = '<p class="error">질문 데이터를 불러오지 못했습니다. 나중에 다시 시도해주세요.</p>';
  }
}

function renderQnA(filter = "전체", searchQuery = "") {
  const list = document.getElementById("qna-list");
  let filtered = filter === "전체" ? qnaData : qnaData.filter(q => q.category === filter);

  if (searchQuery) {
    filtered = filtered.filter(q =>
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  currentPage = Math.min(currentPage, Math.max(1, totalPages));

  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginated = filtered.slice(start, end);

  list.innerHTML = paginated.length > 0 ? paginated.map((q) => `
    <div class="qna-card" role="listitem" aria-expanded="false">
      <div class="question" role="button" tabindex="0" aria-label="질문 펼치기: ${q.question}">
        <i class="fas fa-question-circle"></i> ${q.question}
        <button class="copy-btn" aria-label="질문과 답변 복사: ${q.question}" title="질문과 답변 복사">
          <i class="fas fa-copy"></i>
        </button>
      </div>
      <div class="answer"><i class="fas fa-comment-dots"></i> ${q.answer}</div>
      <div class="category-label">${q.category}</div>
    </div>
  `).join('') : '<p class="no-results">검색 결과가 없습니다.</p>';

  renderPagination(totalPages);

  list.querySelectorAll('.qna-card .question').forEach(question => {
    question.addEventListener('click', toggleAnswer);
    question.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleAnswer(e);
      }
    });
  });

  list.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent the card from toggling
      const card = btn.closest('.qna-card');
      const questionText = card.querySelector('.question').textContent.replace('질문 펼치기:', '').replace('질문과 답변 복사:', '').replace(/\s*[\u{1F4AD}\u{2753}\u{2754}]\s*/gu, '').trim(); // Clean up question text
      const answerText = card.querySelector('.answer').textContent.replace(/\s*[\u{1F4AC}\u{1F4DD}]\s*/gu, '').trim(); // Clean up answer text
      const categoryText = card.querySelector('.category-label').textContent.trim();

      // Improved copy format
      const copyText = `
---
📢 TruePath Q&A
---
🤔 질문: ${questionText}

💡 답변: ${answerText}

🏷️ 카테고리: ${categoryText}
---
      `.trim(); // Using trim() to remove leading/trailing whitespace from the entire block

      navigator.clipboard.writeText(copyText)
        .then(() => showNotification('클립보드에 질문과 답변이 복사되었습니다! ✨', 'success'))
        .catch(() => showNotification('복사에 실패했습니다. 다시 시도해주세요. 😔', 'error'));
    });
  });
}

function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.setAttribute('role', 'alert');
  notification.setAttribute('aria-live', 'assertive');
  notification.textContent = message;
  document.body.appendChild(notification);

  // Position notification near the top right, or center it based on preference
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px'; // Adjust as needed
  notification.style.zIndex = '1000';
  notification.style.padding = '10px 20px';
  notification.style.borderRadius = '5px';
  notification.style.color = 'white';
  notification.style.backgroundColor = 'rgba(0,0,0,0.8)';
  notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
  notification.style.transition = 'opacity 0.3s ease-in-out';
  notification.style.opacity = '1';

  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300); // Wait for fade-out before removing
  }, 2000);
}

function renderPagination(totalPages) {
  const pagination = document.getElementById('pagination');
  if (!pagination) return;
  pagination.innerHTML = `
    <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>이전</button>
    <span>${currentPage} / ${totalPages || 1}</span>
    <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}>다음</button>
  `;
}

function changePage(page) {
  currentPage = page;
  renderQnA(
    document.querySelector('.qna-filter button.active')?.dataset.category || "전체",
    document.getElementById('search-input')?.value || ""
  );
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
      document.querySelectorAll('.qna-filter button').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      currentPage = 1; // Reset page on filter change
      renderQnA(btn.dataset.category, document.getElementById('search-input')?.value || "");
    });
  });

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentPage = 1; // Reset page on search
      renderQnA(
        document.querySelector('.qna-filter button.active')?.dataset.category || "전체",
        e.target.value
      );
    });
  }
});