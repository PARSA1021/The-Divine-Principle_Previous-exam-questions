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
  
  // 현재 페이지가 총 페이지 수를 초과하지 않도록 조정
  if (currentPage > totalPages && totalPages > 0) {
    currentPage = totalPages;
  } else if (totalPages === 0) {
    currentPage = 1;
  }

  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginated = filtered.slice(start, end);

  if (paginated.length > 0) {
    list.innerHTML = paginated.map((q, index) => `
      <div class="qna-card" role="listitem" aria-expanded="false" data-index="${start + index + 1}">
        <div class="question" role="button" tabindex="0" aria-label="질문 펼치기: ${q.question}">
          <span class="question-number" style="
          font-weight: 700;
          color: #3B82F6;
          margin-right: 8px;
          background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 0.9rem;
          border: 1px solid rgba(59, 130, 246, 0.2);
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
        ">${start + index + 1}.</span>
          <i class="fas fa-question-circle"></i> ${q.question}
          <button class="copy-btn" aria-label="질문과 답변 복사: ${q.question}" title="질문과 답변 복사">
            <i class="fas fa-copy"></i>
          </button>
        </div>
        <div class="answer"><i class="fas fa-comment-dots"></i> ${q.answer}</div>
        <div class="category-label">${q.category}</div>
      </div>
    `).join('');
  } else {
    list.innerHTML = '<p class="no-results">검색 결과가 없습니다.</p>';
  }

  renderPagination(totalPages, filtered.length);

  // 이벤트 리스너 추가
  addEventListeners();
}

function renderPagination(totalPages, totalItems) {
  let pagination = document.getElementById('pagination');
  
  // pagination 요소가 없으면 생성
  if (!pagination) {
    pagination = document.createElement('div');
    pagination.id = 'pagination';
    pagination.style.cssText = `
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 12px;
      margin: 3rem auto 2rem;
      flex-wrap: wrap;
      max-width: 52rem;
      padding: 2rem 1rem;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(249, 250, 251, 0.95) 100%);
      border-radius: 20px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.06);
      border: 1px solid rgba(229, 231, 235, 0.8);
      backdrop-filter: blur(10px);
      animation: fadeIn 0.8s ease-out;
    `;
    
    // qna-list 다음에 pagination 요소 추가
    const qnaList = document.getElementById('qna-list');
    if (qnaList && qnaList.parentNode) {
      qnaList.parentNode.insertBefore(pagination, qnaList.nextSibling);
    }
  }
  
  if (totalPages <= 1) {
    pagination.style.display = 'none';
    return;
  }
  
  pagination.style.display = 'flex';
  
  let paginationHTML = '';
  
  // 이전 페이지 버튼 (스타일 포함)
  const prevDisabled = currentPage === 1;
  paginationHTML += `
    <button class="page-btn prev-btn" onclick="changePage(${currentPage - 1})" 
            ${prevDisabled ? 'disabled' : ''}
            style="
              padding: 12px 20px;
              border: 2px solid ${prevDisabled ? '#E5E7EB' : '#3B82F6'};
              background: ${prevDisabled ? '#F9FAFB' : 'linear-gradient(135deg, #3B82F6 0%, #6B7280 100%)'};
              color: ${prevDisabled ? '#9CA3AF' : '#FFFFFF'};
              cursor: ${prevDisabled ? 'not-allowed' : 'pointer'};
              border-radius: 12px;
              font-weight: 600;
              font-size: 0.95rem;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow: ${prevDisabled ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.25)'};
              display: flex;
              align-items: center;
              gap: 8px;
              opacity: ${prevDisabled ? '0.6' : '1'};
              transform: translateY(0);
            "
            onmouseover="${!prevDisabled ? 'this.style.transform=\'translateY(-2px) scale(1.05)\'; this.style.boxShadow=\'0 8px 20px rgba(59, 130, 246, 0.35)\';' : ''}"
            onmouseout="${!prevDisabled ? 'this.style.transform=\'translateY(0) scale(1)\'; this.style.boxShadow=\'0 4px 12px rgba(59, 130, 246, 0.25)\';' : ''}">
      <i class="fas fa-chevron-left"></i> 이전
    </button>
  `;
  
  // 페이지 번호들
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  // 시작 페이지 조정
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  // 첫 페이지와 ... 표시
  if (startPage > 1) {
    paginationHTML += `
      <button class="page-btn" onclick="changePage(1)"
              style="
                padding: 10px 16px;
                border: 2px solid #E5E7EB;
                background: #FFFFFF;
                color: #374151;
                cursor: pointer;
                border-radius: 10px;
                font-weight: 600;
                font-size: 0.95rem;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
                min-width: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
              "
              onmouseover="this.style.borderColor='#3B82F6'; this.style.background='#EFF6FF'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.15)';"
              onmouseout="this.style.borderColor='#E5E7EB'; this.style.background='#FFFFFF'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0, 0, 0, 0.06)';">
        1
      </button>`;
    if (startPage > 2) {
      paginationHTML += `<span class="page-dots" style="padding: 12px 8px; color: #6B7280; font-weight: 600; font-size: 1.1rem;">⋯</span>`;
    }
  }
  
  // 페이지 번호 버튼들에 스타일 추가
  for (let i = startPage; i <= endPage; i++) {
    const isActive = i === currentPage;
    paginationHTML += `
      <button class="page-btn ${isActive ? 'active' : ''}" 
              onclick="changePage(${i})"
              style="
                padding: 10px 16px;
                border: 2px solid ${isActive ? '#3B82F6' : '#E5E7EB'};
                background: ${isActive ? 'linear-gradient(135deg, #3B82F6 0%, #6B7280 100%)' : '#FFFFFF'};
                color: ${isActive ? '#FFFFFF' : '#374151'};
                cursor: pointer;
                border-radius: 10px;
                font-weight: ${isActive ? '700' : '600'};
                font-size: 0.95rem;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: ${isActive ? '0 4px 12px rgba(59, 130, 246, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.06)'};
                min-width: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
                transform: ${isActive ? 'translateY(-1px) scale(1.05)' : 'translateY(0)'};
              "
              onmouseover="${!isActive ? 'this.style.borderColor=\'#3B82F6\'; this.style.background=\'#EFF6FF\'; this.style.transform=\'translateY(-2px)\'; this.style.boxShadow=\'0 4px 12px rgba(59, 130, 246, 0.15)\';' : ''}"
              onmouseout="${!isActive ? 'this.style.borderColor=\'#E5E7EB\'; this.style.background=\'#FFFFFF\'; this.style.transform=\'translateY(0)\'; this.style.boxShadow=\'0 2px 8px rgba(0, 0, 0, 0.06)\';' : ''}">
        ${i}
      </button>
    `;
  }
  
  // ... 표시와 마지막 페이지
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += `<span class="page-dots" style="padding: 12px 8px; color: #6B7280; font-weight: 600; font-size: 1.1rem;">⋯</span>`;
    }
    paginationHTML += `
      <button class="page-btn" onclick="changePage(${totalPages})"
              style="
                padding: 10px 16px;
                border: 2px solid #E5E7EB;
                background: #FFFFFF;
                color: #374151;
                cursor: pointer;
                border-radius: 10px;
                font-weight: 600;
                font-size: 0.95rem;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
                min-width: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
              "
              onmouseover="this.style.borderColor='#3B82F6'; this.style.background='#EFF6FF'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.15)';"
              onmouseout="this.style.borderColor='#E5E7EB'; this.style.background='#FFFFFF'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0, 0, 0, 0.06)';">
        ${totalPages}
      </button>`;
  }
  
  // 다음 페이지 버튼
  const nextDisabled = currentPage === totalPages;
  paginationHTML += `
    <button class="page-btn next-btn" onclick="changePage(${currentPage + 1})" 
            ${nextDisabled ? 'disabled' : ''}
            style="
              padding: 12px 20px;
              border: 2px solid ${nextDisabled ? '#E5E7EB' : '#3B82F6'};
              background: ${nextDisabled ? '#F9FAFB' : 'linear-gradient(135deg, #3B82F6 0%, #6B7280 100%)'};
              color: ${nextDisabled ? '#9CA3AF' : '#FFFFFF'};
              cursor: ${nextDisabled ? 'not-allowed' : 'pointer'};
              border-radius: 12px;
              font-weight: 600;
              font-size: 0.95rem;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow: ${nextDisabled ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.25)'};
              display: flex;
              align-items: center;
              gap: 8px;
              opacity: ${nextDisabled ? '0.6' : '1'};
              transform: translateY(0);
            "
            onmouseover="${!nextDisabled ? 'this.style.transform=\'translateY(-2px) scale(1.05)\'; this.style.boxShadow=\'0 8px 20px rgba(59, 130, 246, 0.35)\';' : ''}"
            onmouseout="${!nextDisabled ? 'this.style.transform=\'translateY(0) scale(1)\'; this.style.boxShadow=\'0 4px 12px rgba(59, 130, 246, 0.25)\';' : ''}">
      다음 <i class="fas fa-chevron-right"></i>
    </button>
  `;
  
  // 페이지 정보 표시
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  paginationHTML += `
    <div class="page-info" style="
      font-size: 0.95rem;
      color: #6B7280;
      font-weight: 600;
      margin-left: 20px;
      padding: 12px 20px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(249, 250, 251, 0.95) 100%);
      border-radius: 12px;
      border: 1px solid rgba(229, 231, 235, 0.8);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      backdrop-filter: blur(5px);
      letter-spacing: 0.02em;
      white-space: nowrap;
    ">
      <i class="fas fa-info-circle" style="color: #3B82F6; margin-right: 8px;"></i>
      ${startItem}-${endItem} / 총 <span style="color: #3B82F6; font-weight: 700;">${totalItems}</span>개 
      <span style="color: #9CA3AF; margin: 0 8px;">•</span>
      <span style="color: #3B82F6; font-weight: 700;">${currentPage}</span>/${totalPages} 페이지
    </div>
  `;
  
  pagination.innerHTML = paginationHTML;
}

function changePage(page) {
  const filter = document.querySelector('.qna-filter button.active')?.dataset.category || "전체";
  const searchQuery = document.getElementById('search-input')?.value || "";
  
  // 필터링된 데이터로 총 페이지 수 계산
  let filtered = filter === "전체" ? qnaData : qnaData.filter(q => q.category === filter);
  if (searchQuery) {
    filtered = filtered.filter(q =>
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  
  // 페이지 범위 검증
  if (page < 1 || page > totalPages || page === currentPage) {
    return;
  }
  
  currentPage = page;
  renderQnA(filter, searchQuery);
  
  // 페이지 변경 후 스크롤을 맨 위로
  document.getElementById('qna-list').scrollIntoView({ 
    behavior: 'smooth', 
    block: 'start' 
  });
}

function addEventListeners() {
  const list = document.getElementById("qna-list");
  
  // 질문 클릭 이벤트
  list.querySelectorAll('.qna-card .question').forEach(question => {
    question.addEventListener('click', toggleAnswer);
    question.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleAnswer(e);
      }
    });
  });

  // 복사 버튼 이벤트
  list.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.qna-card');
      const questionText = card.querySelector('.question').textContent
        .replace(/^\d+\./, '') // 번호 제거
        .replace('질문 펼치기:', '')
        .replace('질문과 답변 복사:', '')
        .replace(/\s*[\u{1F4AD}\u{2753}\u{2754}]\s*/gu, '')
        .trim();
      
      const answerText = card.querySelector('.answer').textContent
        .replace(/\s*[\u{1F4AC}\u{1F4DD}]\s*/gu, '')
        .trim();
      
      const categoryText = card.querySelector('.category-label').textContent.trim();
      const questionNumber = card.dataset.index;

      const copyText = `
---
📢 TruePath Q&A (${questionNumber}번)
---
🤔 질문: ${questionText}

💡 답변: ${answerText}

🏷️ 카테고리: ${categoryText}
---
      `.trim();

      navigator.clipboard.writeText(copyText)
        .then(() => showNotification('클립보드에 질문과 답변이 복사되었습니다! ✨', 'success'))
        .catch(() => showNotification('복사에 실패했습니다. 다시 시도해주세요. 😔', 'error'));
    });
  });
}

function toggleAnswer(event) {
  const card = event.target.closest('.qna-card');
  const isExpanded = card.getAttribute('aria-expanded') === 'true';
  card.setAttribute('aria-expanded', !isExpanded);
}

function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.setAttribute('role', 'alert');
  notification.setAttribute('aria-live', 'assertive');
  notification.textContent = message;
  document.body.appendChild(notification);

  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.zIndex = '1000';
  notification.style.padding = '12px 20px';
  notification.style.borderRadius = '8px';
  notification.style.color = 'white';
  notification.style.backgroundColor = type === 'success' ? '#28a745' : '#dc3545';
  notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  notification.style.transition = 'all 0.3s ease-in-out';
  notification.style.opacity = '0';
  notification.style.transform = 'translateY(-10px)';
  
  // 애니메이션
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-10px)';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  fetchQnA();

  // 필터 버튼 이벤트
  document.querySelectorAll('.qna-filter button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.qna-filter button').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      currentPage = 1; // 필터 변경 시 첫 페이지로
      renderQnA(btn.dataset.category, document.getElementById('search-input')?.value || "");
    });
  });

  // 검색 입력 이벤트
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentPage = 1; // 검색 시 첫 페이지로
      renderQnA(
        document.querySelector('.qna-filter button.active')?.dataset.category || "전체",
        e.target.value
      );
    });
  }
  
  // 키보드 네비게이션 추가
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return; // 입력 필드에서는 무시
    
    const filter = document.querySelector('.qna-filter button.active')?.dataset.category || "전체";
    const searchQuery = document.getElementById('search-input')?.value || "";
    let filtered = filter === "전체" ? qnaData : qnaData.filter(q => q.category === filter);
    if (searchQuery) {
      filtered = filtered.filter(q =>
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.answer.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    
    if (e.key === 'ArrowLeft' && currentPage > 1) {
      changePage(currentPage - 1);
    } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
      changePage(currentPage + 1);
    }
  });
});