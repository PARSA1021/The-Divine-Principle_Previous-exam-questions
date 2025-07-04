/**
 * 애플리케이션 상수 정의
 * - 애플리케이션 전반에서 사용되는 고정된 값을 저장합니다.
 */
const CONSTANTS = {
    RESULTS_PER_PAGE: 10, // 한 페이지에 표시할 검색 결과 수
    DEBOUNCE_DELAY: 300, // 검색 입력 지연 시간 (ms)
    TOAST_DURATION: 3000, // 알림 메시지 표시 시간 (ms)
    ACCOUNT_NUMBER: "02060204230715", // 계좌 번호
    ACCOUNT_HOLDER: "국민은행 020602-04-230715 (예금주: 문성민)", // 계좌 정보
    PAGES: { HOME: 'home', WORKBOOK: 'workbook' }, // 페이지 이름 정의
    MAX_TEXT_LENGTH: 500, // 텍스트 최대 길이
    PREVIEW_START: 150, // 미리보기 텍스트 시작 길이
    PREVIEW_END: 100, // 미리보기 텍스트 끝 길이
    MAX_SEARCH_HISTORY: 10, // 검색 기록 최대 저장 개수
    SCROLL_DURATION: 600, // 스크롤 애니메이션 시간 (ms)
    HEADER_OFFSET: 80 // 고정 헤더 높이 조정
};

/**
 * 카테고리 상수 정의
 * - 하드코딩된 카테고리 문자열을 관리합니다.
 */
const CATEGORIES = {
    ALL: '전체',
    CHEON_SEONG_GYEONG: '천성경',
    CHAM_BUMO_GYEONG: '참부모경',
    CHAM_BUMO_NIM: '참부모님 말씀',
    CHAM_EOMEONIM: '참어머님 말씀',
    CHEON_SHIM_WON: '천심원'
};

/**
 * 퀴즈 유형 상수 정의
 * - 퀴즈 관련 하드코딩된 문자열을 관리합니다.
 */
const QUIZ_TYPES = {
    DIVINE_PRINCIPLE: '원리강론',
    BIBLE: '성경'
};

/**
 * 퀴즈 페이지 매핑
 */
const QUIZ_PAGES = {
    [QUIZ_TYPES.DIVINE_PRINCIPLE]: 'divine.html',
    [QUIZ_TYPES.BIBLE]: 'bible.html'
};

/**
 * 전역 상태 관리
 * - 애플리케이션의 현재 상태를 저장하고 관리합니다.
 */
const state = {
    messages: [], // 메시지 데이터 배열
    currentCategory: localStorage.getItem('currentCategory') || CATEGORIES.ALL, // 현재 선택된 카테고리
    searchHistory: JSON.parse(localStorage.getItem('searchHistory')) || [], // 검색 기록 배열
    currentPage: 1 // 현재 페이지 번호
};

/**
 * DOM 요소 캐싱
 * - 자주 사용되는 HTML 요소를 캐싱하여 성능을 최적화합니다.
 */
const DOM = {
    searchInput: document.getElementById('search-input'), // 검색 입력 필드
    searchResults: document.getElementById('search-results'), // 검색 결과 표시 영역
    searchStats: document.getElementById('search-stats'), // 검색 통계 표시 영역
    searchLoading: document.getElementById('search-loading'), // 로딩 표시 영역
    searchSuggestions: document.getElementById('search-suggestions'), // 검색 제안 목록
    progressBar: document.querySelector('.progress-bar div'), // 진행 바
    categoryButtons: document.querySelectorAll('.category-container button'), // 카테고리 버튼들
    navButtons: document.querySelectorAll('.nav-bar button[data-page]'), // 네비게이션 버튼들
    backToTop: document.querySelector('.back-to-top'), // 맨 위로 이동 버튼
    clearSearch: document.getElementById('clear-search') // 검색 초기화 버튼
};

/**
 * 디바운스 유틸리티
 * @param {Function} func - 실행할 함수
 * @param {number} delay - 지연 시간 (ms)
 * @returns {Function} - 디바운스된 함수
 */
const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

/**
 * 진행 바 업데이트
 * @param {string} percentage - 진행 퍼센트 (예: '20%')
 * @param {number} [resetDelay] - 초기화 지연 시간 (ms)
 */
const updateProgressBar = (percentage, resetDelay) => {
    DOM.progressBar.style.width = percentage;
    if (resetDelay) {
        setTimeout(() => DOM.progressBar.style.width = '0', resetDelay);
    }
};

/**
 * 부드러운 스크롤 애니메이션
 * @param {number} targetY - 목표 스크롤 위치
 * @param {number} duration - 애니메이션 지속 시간
 */
const smoothScroll = (targetY, duration) => {
    const startY = window.scrollY;
    const distance = targetY - startY;
    const startTime = performance.now();
    const easeInOutQuad = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    const animation = currentTime => {
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        const ease = easeInOutQuad(progress);
        window.scrollTo(0, startY + distance * ease);
        if (progress < 1) requestAnimationFrame(animation);
    };
    requestAnimationFrame(animation);
};

/**
 * 지정된 위치 또는 요소로 부드럽게 스크롤
 * @param {number|HTMLElement} target - 스크롤 목표 (위치 또는 요소)
 * @param {number} duration - 애니메이션 지속 시간
 */
const smoothScrollTo = (target, duration) => {
    let targetY;
    if (typeof target === 'number') {
        targetY = target;
    } else if (target) {
        targetY = target.getBoundingClientRect().top + window.scrollY - CONSTANTS.HEADER_OFFSET;
    } else {
        return;
    }
    smoothScroll(targetY, duration);
};

/**
 * 페이지 맨 위로 부드럽게 이동
 */
const scrollToTop = () => smoothScrollTo(0, CONSTANTS.SCROLL_DURATION);

/**
 * 검색 결과 상단으로 부드럽게 이동
 */
const scrollToResultsTop = () => smoothScrollTo(DOM.searchResults, CONSTANTS.SCROLL_DURATION);

/**
 * 다크 모드 전환
 */
const toggleDarkMode = () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode') ? 'enabled' : 'disabled');
};

/**
 * 계좌번호 클립보드에 복사
 * @returns {Promise<void>}
 */
const copyAccountNumber = async () => {
    try {
        await navigator.clipboard.writeText(CONSTANTS.ACCOUNT_NUMBER);
        showToast('계좌번호가 복사되었습니다!');
    } catch (err) {
        console.error('계좌번호 복사 실패:', err);
        showToast(`계좌번호 복사 실패: ${CONSTANTS.ACCOUNT_HOLDER}`);
    }
};

/**
 * 메시지를 클립보드에 복사
 * @param {string} text - 메시지 텍스트
 * @param {string} source - 메시지 출처
 * @param {string} category - 메시지 카테고리
 * @param {HTMLElement} element - 결과 항목 요소
 * @returns {Promise<void>}
 */
const copyMessageToClipboard = async (text, source, category, element) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const useHundokFormat = confirm(`📅 ${today} 훈독 말씀 형식으로 복사할까요?\n\n✅ 확인: 훈독 형식\n❌ 취소: 기본 형식`);
        const formattedText = useHundokFormat
            ? `🌟${today} 훈독 말씀 🌟\n${text}\n\n📜 카테고리: ${category}\n📖 출처: ${source}\n——————————————————`
            : `🌟 말씀 🌟\n${text}\n\n📜 카테고리: ${category}\n📖 출처: ${source}\n——————————————————`;
        
        await navigator.clipboard.writeText(formattedText);
        showToast('말씀과 출처가 복사되었습니다!');
        element.classList.add('copied');
        setTimeout(() => element.classList.remove('copied'), 1000);
    } catch (err) {
        console.error('텍스트 복사 실패:', err);
        showToast('복사 실패! 직접 선택하여 복사해 주세요.');
    }
};

/**
 * 알림 메시지 표시
 * @param {string} message - 표시할 메시지
 */
const showToast = (message) => {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <span>${message}</span>
        <button class="close-toast" aria-label="알림 닫기">✕</button>
    `;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    
    const closeButton = toast.querySelector('.close-toast');
    const closeToast = () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    };
    
    toast.addEventListener('click', closeToast);
    closeButton.addEventListener('click', closeToast);
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => closeToast(), CONSTANTS.TOAST_DURATION);
};

/**
 * 메시지 데이터 로드
 * @returns {Promise<void>}
 */
const loadMessages = async () => {
    DOM.searchLoading.style.display = 'flex';
    updateProgressBar('20%');
    try {
        const response = await fetch('messages.json', { cache: 'no-store' });
        updateProgressBar('60%');
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        state.messages = await response.json();
        updateProgressBar('100%');
        state.messages = state.messages.map(msg => ({
            ...msg,
            category: msg.category || categorizeMessage(msg.source)
        }));
    } catch (error) {
        console.error('메시지 로드 실패:', error);
        let errorMessage = '메시지 로드 실패. 네트워크를 확인하세요.';
        if (error.message.includes('JSON')) {
            errorMessage = '데이터 형식이 잘못되었습니다. 관리자에게 문의하세요.';
        }
        DOM.searchResults.innerHTML = `
            <p class="no-results" role="alert">
                ${errorMessage}
                <button onclick="loadMessages()" aria-label="다시 시도">다시 시도</button>
            </p>`;
    } finally {
        setTimeout(() => {
            DOM.searchLoading.style.display = 'none';
            updateProgressBar('0', 300);
        }, 300);
    }
};

/**
 * 메시지 출처에 따라 카테고리 지정
 * @param {string} source - 메시지 출처
 * @returns {string} - 카테고리 이름
 */
const categorizeMessage = (source) => {
    const categories = [
        { key: '천성경', value: CATEGORIES.CHEON_SEONG_GYEONG },
        { key: '참부모경', value: CATEGORIES.CHAM_BUMO_GYEONG },
        { key: '참부모님 말씀', value: CATEGORIES.CHAM_BUMO_NIM },
        { key: '참어머님 말씀', value: CATEGORIES.CHAM_EOMEONIM },
        { key: '천심원', value: CATEGORIES.CHEON_SHIM_WON }
    ];
    return categories.find(cat => source.includes(cat.key))?.value || CATEGORIES.ALL;
};

/**
 * 검색어 하이라이트
 * @param {string} text - 원본 텍스트
 * @param {string} query - 검색어
 * @returns {string} - 하이라이트된 HTML 텍스트
 */
const highlightText = (text, query) => {
    if (!query) return text;
    try {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedQuery, 'gi');
        return text.replace(regex, match => `<span class="highlight">${match}</span>`);
    } catch (e) {
        console.warn('유효하지 않은 정규식 쿼리:', e);
        return text;
    }
};

/**
 * 긴 텍스트를 축약하고 페이드 효과 추가
 * @param {string} text - 원본 텍스트
 * @param {string} query - 검색어
 * @returns {string} - 축약된 HTML 텍스트
 */
const truncateText = (text, query) => {
    if (text.length <= CONSTANTS.MAX_TEXT_LENGTH) {
        return highlightText(text, query);
    }
    const startText = text.slice(0, CONSTANTS.PREVIEW_START);
    const endText = text.slice(-CONSTANTS.PREVIEW_END);
    return `
        <span class="truncated-text">${highlightText(startText, query)}<span class="fade-out"></span></span>
        <span class="full-text" style="display: none;">${highlightText(text, query)}</span>
        <span class="fade-in"></span>${highlightText(endText, query)}
        <button class="toggle-text" onclick="toggleText(this)" aria-expanded="false" aria-label="전체 텍스트 보기">전체 보기</button>
    `;
};

/**
 * 축약된 텍스트와 전체 텍스트 전환
 * @param {HTMLElement} button - 토글 버튼
 */
const toggleText = (button) => {
    const resultItem = button.closest('.result-item');
    const truncatedText = resultItem.querySelector('.truncated-text');
    const fullText = resultItem.querySelector('.full-text');
    const isExpanded = button.getAttribute('aria-expanded') === 'true';

    truncatedText.style.display = isExpanded ? 'inline' : 'none';
    fullText.style.display = isExpanded ? 'none' : 'inline';
    button.textContent = isExpanded ? '전체 보기' : '접기';
    button.setAttribute('aria-expanded', !isExpanded);
    button.setAttribute('aria-label', isExpanded ? '전체 텍스트 보기' : '텍스트 접기');
};

/**
 * "모든 검색 기록 삭제" 버튼 HTML 생성
 * @returns {string} - 버튼 HTML
 */
const renderClearAllButton = () => `
    <div class="suggestion clear-all" role="button" tabindex="0" onclick="clearSearchHistory()" aria-label="모든 검색 기록 삭제">
        모든 검색 기록 삭제
    </div>
`;

/**
 * 검색 제안 목록 렌더링
 */
const renderSearchSuggestions = () => {
    const query = DOM.searchInput.value.trim().toLowerCase();
    let html = '';
    if (query && state.searchHistory.length > 0) {
        html = state.searchHistory
            .filter(q => q.toLowerCase().includes(query))
            .map((q, index) => `
                <div class="suggestion" role="option" tabindex="0">
                    <span onclick="selectSuggestion('${q.replace(/'/g, "\\'")}')">${q}</span>
                    <button class="delete-suggestion" onclick="deleteSearchHistory(${index})" aria-label="검색 기록 삭제: ${q}">✕</button>
                </div>
            `).join('');
    }
    if (state.searchHistory.length > 0) {
        html += renderClearAllButton();
    }
    DOM.searchSuggestions.innerHTML = html;
    DOM.searchSuggestions.style.display = state.searchHistory.length > 0 ? 'block' : 'none';
};

/**
 * 검색 기록 삭제
 * @param {number} index - 삭제할 기록의 인덱스
 */
const deleteSearchHistory = (index) => {
    state.searchHistory.splice(index, 1);
    localStorage.setItem('searchHistory', JSON.stringify(state.searchHistory));
    renderSearchSuggestions();
    showToast('검색 기록이 삭제되었습니다.');
};

/**
 * 모든 검색 기록 삭제
 */
const clearSearchHistory = () => {
    state.searchHistory = [];
    localStorage.setItem('searchHistory', JSON.stringify(state.searchHistory));
    DOM.searchSuggestions.style.display = 'none';
    showToast('모든 검색 기록이 삭제되었습니다.');
};

/**
 * 검색 제안 선택 및 검색 실행
 * @param {string} query - 선택된 검색어
 */
const selectSuggestion = (query) => {
    DOM.searchInput.value = query;
    DOM.searchSuggestions.style.display = 'none';
    searchMessages();
};

/**
 * 메시지 검색 및 페이지네이션 결과 표시
 * @param {number} page - 페이지 번호
 */
const searchMessages = debounce((page = 1) => {
    const query = DOM.searchInput.value.trim();
    DOM.searchLoading.style.display = 'flex';
    updateProgressBar('20%');
    DOM.searchResults.innerHTML = '';
    DOM.searchResults.style.display = 'none';
    DOM.searchStats.style.display = 'none';
    state.currentPage = page;

    let filteredMessages = state.messages;

    if (state.currentCategory !== CATEGORIES.ALL) {
        filteredMessages = filteredMessages.filter(msg => msg.category === state.currentCategory);
    }

    if (query) {
        const queryRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        filteredMessages = filteredMessages.map(msg => ({
            ...msg,
            matchCount: (msg.text.match(queryRegex) || []).length
        })).filter(msg => msg.text.toLowerCase().includes(query.toLowerCase()));
        filteredMessages.sort((a, b) => b.matchCount - a.matchCount);

        if (!state.searchHistory.includes(query)) {
            state.searchHistory.unshift(query);
            if (state.searchHistory.length > CONSTANTS.MAX_SEARCH_HISTORY) {
                state.searchHistory.pop();
            }
            localStorage.setItem('searchHistory', JSON.stringify(state.searchHistory));
        }
    }

    const startTime = performance.now();
    updateProgressBar('60%');
    const startIndex = (page - 1) * CONSTANTS.RESULTS_PER_PAGE;
    const endIndex = startIndex + CONSTANTS.RESULTS_PER_PAGE;
    const paginatedMessages = filteredMessages.slice(startIndex, endIndex);

    if (filteredMessages.length === 0 && (query || state.currentCategory !== CATEGORIES.ALL)) {
        DOM.searchResults.innerHTML = '<p class="no-results" role="alert">검색 결과가 없습니다.</p>';
        DOM.searchResults.style.display = 'block';
    } else if (paginatedMessages.length > 0) {
        DOM.searchResults.innerHTML = paginatedMessages.map(msg => {
            const displayText = truncateText(msg.text, query);
            const matchCount = msg.matchCount || 0;
            return `
                <div class="result-item" role="listitem" tabindex="0">
                    <h3><i class="fas fa-book" aria-hidden="true"></i> ${msg.category}</h3>
                    <p>${displayText} ${matchCount > 0 && query ? `<span class="match-count" aria-label="일치 횟수 ${matchCount}회">${matchCount}</span>` : ''}</p>
                    <p class="source"><i class="fas fa-bookmark" aria-hidden="true"></i> ${msg.source}</p>
                    <button class="copy-button" onclick="copyMessageToClipboard('${msg.text.replace(/'/g, "\\'")}', '${msg.source.replace(/'/g, "\\'")}', '${msg.category.replace(/'/g, "\\'")}', this.closest('.result-item'))" aria-label="${msg.category} 말씀과 출처 복사">
                        <i class="fas fa-copy" aria-hidden="true"></i> 복사하기
                    </button>
                </div>
            `;
        }).join('');

        if (filteredMessages.length > endIndex) {
            DOM.searchResults.innerHTML += `
                <button onclick="searchMessages(${page + 1})" class="quiz-button blue next-page-button" aria-label="다음 페이지">다음 페이지</button>
            `;
        }
        DOM.searchResults.innerHTML += `
            <button class="back-to-top result-top" onclick="scrollToResultsTop()" aria-label="검색 결과 맨 위로 이동" style="position: static; margin: 1rem auto; display: block;">
                <i class="fas fa-arrow-up" aria-hidden="true"></i> 맨 위로
            </button>
        `;
        DOM.searchResults.style.display = 'flex';
        DOM.searchResults.setAttribute('aria-live', 'polite');
    }

    const endTime = performance.now();
    DOM.searchStats.style.display = 'block';
    DOM.searchStats.innerHTML = `총 ${filteredMessages.length}개의 결과 (검색 시간: ${(endTime - startTime).toFixed(2)}ms)`;
    DOM.searchLoading.style.display = 'none';
    updateProgressBar('100%');
    setTimeout(() => updateProgressBar('0'), 300);
}, CONSTANTS.DEBOUNCE_DELAY);

/**
 * 검색 입력 및 카테고리 초기화
 */
const clearSearch = () => {
    DOM.searchInput.value = '';
    state.currentCategory = CATEGORIES.ALL;
    localStorage.setItem('currentCategory', state.currentCategory);
    
    DOM.categoryButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-category') === CATEGORIES.ALL);
        btn.setAttribute('aria-current', btn.getAttribute('data-category') === CATEGORIES.ALL ? 'true' : 'false');
    });

    DOM.searchResults.innerHTML = '';
    DOM.searchResults.style.display = 'none';
    DOM.searchStats.style.display = 'none';
    DOM.searchSuggestions.style.display = 'none';
    DOM.clearSearch?.classList.add('shake');
    setTimeout(() => DOM.clearSearch?.classList.remove('shake'), 300);
    searchMessages();
};

/**
 * 지정된 페이지 표시
 * @param {string} pageId - 표시할 페이지 ID
 */
const showPage = (pageId) => {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelector(`#${pageId}`).classList.add('active');

    DOM.navButtons.forEach(button => {
        button.classList.toggle('active', button.getAttribute('data-page') === pageId);
        button.setAttribute('aria-current', button.getAttribute('data-page') === pageId ? 'page' : 'false');
    });

    if (pageId === CONSTANTS.PAGES.WORKBOOK) {
        loadMessages().then(() => searchMessages());
    }
};

/**
 * 퀴즈 페이지 시작
 * @param {string} quizType - 퀴즈 유형
 */
const startQuiz = (quizType) => {
    const url = QUIZ_PAGES[quizType];
    if (url) {
        window.location.href = url;
    } else {
        console.error('유효하지 않은 퀴즈 유형:', quizType);
        showToast('퀴즈를 시작할 수 없습니다. 다시 시도하세요.');
    }
};

/**
 * 애플리케이션 초기화
 */
const initializeApp = () => {
    const initialCategoryButton = document.querySelector(`.category-container button[data-category="${state.currentCategory}"]`);
    if (initialCategoryButton) {
        initialCategoryButton.classList.add('active');
        initialCategoryButton.setAttribute('aria-current', 'true');
    }

    DOM.navButtons.forEach(button => {
        button.addEventListener('click', () => showPage(button.getAttribute('data-page')));
    });

    DOM.categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            DOM.categoryButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-current', 'false');
            });
            this.classList.add('active');
            this.setAttribute('aria-current', 'true');
            state.currentCategory = this.getAttribute('data-category');
            localStorage.setItem('currentCategory', state.currentCategory);
            searchMessages();
        });
    });

    DOM.searchInput.addEventListener('input', renderSearchSuggestions);
    DOM.searchInput.addEventListener('focus', renderSearchSuggestions);
    DOM.searchInput.addEventListener('blur', () => {
        setTimeout(() => DOM.searchSuggestions.style.display = 'none', 200);
    });
    DOM.searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            searchMessages();
            DOM.searchSuggestions.style.display = 'none';
        }
    });

    DOM.searchSuggestions.addEventListener('keydown', e => {
        const suggestions = DOM.searchSuggestions.querySelectorAll('.suggestion');
        if (suggestions.length === 0) return;

        const currentIndex = Array.from(suggestions).findIndex(s => s === document.activeElement);
        let nextIndex = currentIndex;

        if (e.key === 'ArrowDown') {
            nextIndex = (currentIndex + 1) % suggestions.length;
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
            nextIndex = (currentIndex - 1 + suggestions.length) % suggestions.length;
            e.preventDefault();
        } else if (e.key === 'Enter' && currentIndex >= 0) {
            selectSuggestion(suggestions[currentIndex].querySelector('span')?.textContent || suggestions[currentIndex].textContent);
            e.preventDefault();
        } else if (e.key === 'Delete' && currentIndex >= 0) {
            const index = state.searchHistory.indexOf(suggestions[currentIndex].querySelector('span')?.textContent || suggestions[currentIndex].textContent);
            if (index !== -1) deleteSearchHistory(index);
            e.preventDefault();
        }

        if (nextIndex !== currentIndex) {
            suggestions[nextIndex].focus();
        }
    });

    DOM.searchResults.addEventListener('keydown', e => {
        const results = DOM.searchResults.querySelectorAll('.result-item');
        if (results.length === 0) return;

        const currentIndex = Array.from(results).findIndex(r => r === document.activeElement);
        let nextIndex = currentIndex;

        if (e.key === 'ArrowDown') {
            nextIndex = (currentIndex + 1) % results.length;
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
            nextIndex = (currentIndex - 1 + results.length) % results.length;
            e.preventDefault();
        }

        if (nextIndex !== currentIndex) {
            results[nextIndex].focus();
        }
    });

    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            if (DOM.backToTop) {
                DOM.backToTop.style.display = window.scrollY > 300 ? 'flex' : 'none';
                if (window.scrollY > 300) {
                    DOM.backToTop.classList.add('show');
                } else {
                    DOM.backToTop.classList.remove('show');
                }
            }
        }, 100);
    });

    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === '/') {
            e.preventDefault();
            DOM.searchInput.focus();
        }
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            searchMessages();
        }
        if (e.ctrlKey && e.key === 'Backspace') {
            e.preventDefault();
            clearSearch();
        }
    });

    document.querySelectorAll('button').forEach(element => {
        element.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                element.click();
            }
        });
    });

    if (DOM.clearSearch) {
        DOM.clearSearch.addEventListener('click', clearSearch);
    }

    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
    }

    showPage(CONSTANTS.PAGES.HOME);
};

document.addEventListener('DOMContentLoaded', initializeApp);