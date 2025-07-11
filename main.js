/**
 * 애플리케이션 상수 정의
 * - 애플리케이션 전반에서 사용되는 고정된 값을 저장합니다.
 */
const CONSTANTS = {
    RESULTS_PER_PAGE: 10, // 한 페이지에 표시할 검색 결과 수
    DEBOUNCE_DELAY: 300, // 검색 입력 지연 시간 (ms)
    TOAST_DURATION: 3000, // 알림 메시지 표시 시간 (ms)
    ACCOUNT_NUMBER: '02060204230715', // 계좌 번호
    ACCOUNT_HOLDER: '국민은행 020602-04-230715 (예금주: 문성민)', // 계좌 정보
    PAGES: { HOME: 'home', WORKBOOK: 'workbook' }, // 페이지 이름 정의
    MAX_TEXT_LENGTH: 1000, // 텍스트 최대 길이 (이 길이보다 짧으면 축약하지 않음)
    MAX_SEARCH_HISTORY: 10, // 검색 기록 최대 저장 개수
    SCROLL_DURATION: 600, // 스크롤 애니메이션 시간 (ms)
    HEADER_OFFSET: 80, // 고정 헤더 높이 조정
    SORT_ORDER: { // 정렬 순서 상수 정의
        DEFAULT: 'default', // 기본 (검색 일치 횟수)
        LENGTH_ASC: 'length_asc', // 길이 짧은순
        LENGTH_DESC: 'length_desc' // 길이 긴순
    }
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
 * - 퀴즈 유형에 따른 HTML 파일 경로를 정의합니다.
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
    currentPage: 1, // 현재 페이지 번호
    currentSortOrder: CONSTANTS.SORT_ORDER.DEFAULT // 현재 정렬 순서
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
    clearSearch: document.getElementById('clear-search'), // 검색 초기화 버튼
    sortSelect: document.getElementById('sort-select'), // 정렬 선택 드롭다운
    randomMessageButton: document.getElementById('random-message-button') // 랜덤 말씀 보기 버튼
};

/**
 * 디바운스 유틸리티 함수
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
 * @param {number} [resetDelay] - 초기화 지연 시간 (ms). 지정된 경우, 해당 시간 후 진행 바를 0으로 초기화합니다.
 */
const updateProgressBar = (percentage, resetDelay) => {
    DOM.progressBar.style.width = percentage;
    if (resetDelay) {
        setTimeout(() => DOM.progressBar.style.width = '0', resetDelay);
    }
};

/**
 * 부드러운 스크롤 애니메이션
 * @param {number} targetY - 목표 스크롤 위치 (Y 좌표)
 * @param {number} duration - 애니메이션 지속 시간 (ms)
 */
const smoothScroll = (targetY, duration) => {
    const startY = window.scrollY;
    const distance = targetY - startY;
    const startTime = performance.now();

    // Quad easing 함수
    const easeInOutQuad = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    const animation = currentTime => {
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        const ease = easeInOutQuad(progress);
        window.scrollTo(0, startY + distance * ease);

        if (progress < 1) {
            requestAnimationFrame(animation);
        }
    };
    requestAnimationFrame(animation);
};

/**
 * 지정된 위치 또는 요소로 부드럽게 스크롤
 * @param {number|HTMLElement} target - 스크롤 목표 (Y 좌표 또는 HTMLElement)
 * @param {number} duration - 애니메이션 지속 시간 (ms)
 */
const smoothScrollTo = (target, duration) => {
    let targetY;
    if (typeof target === 'number') {
        targetY = target;
    } else if (target instanceof HTMLElement) {
        targetY = target.getBoundingClientRect().top + window.scrollY - CONSTANTS.HEADER_OFFSET;
    } else {
        return; // 유효하지 않은 타겟일 경우 함수 종료
    }
    smoothScroll(targetY, duration);
};

/**
 * 페이지 맨 위로 부드럽게 이동합니다.
 */
const scrollToTop = () => smoothScrollTo(0, CONSTANTS.SCROLL_DURATION);

/**
 * 검색 결과 영역의 상단으로 부드럽게 이동합니다.
 */
const scrollToResultsTop = () => smoothScrollTo(DOM.searchResults, CONSTANTS.SCROLL_DURATION);

/**
 * 다크 모드를 전환합니다.
 * body 요소에 'dark-mode' 클래스를 토글하고 localStorage에 상태를 저장합니다.
 */
const toggleDarkMode = () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode') ? 'enabled' : 'disabled');
};

/**
 * 계좌 번호를 클립보드에 복사합니다.
 * 성공 시 토스트 메시지를 표시하고, 실패 시 에러 메시지를 표시합니다.
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
 * 특정 메시지의 텍스트, 출처, 카테고리를 클립보드에 복사합니다.
 * 훈독 말씀 형식으로 복사할지 여부를 사용자에게 확인합니다.
 * @param {string} text - 복사할 메시지 텍스트
 * @param {string} source - 메시지의 출처
 * @param {string} category - 메시지의 카테고리
 * @param {HTMLElement} element - 복사 버튼이 속한 결과 항목 DOM 요소
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

        // 시각적 피드백
        element.classList.add('copied');
        setTimeout(() => element.classList.remove('copied'), 1000);
    } catch (err) {
        console.error('텍스트 복사 실패:', err);
        showToast('복사 실패! 직접 선택하여 복사해 주세요.');
    }
};

/**
 * 사용자에게 알림 메시지를 표시합니다.
 * @param {string} message - 표시할 메시지 텍스트
 */
const showToast = (message) => {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <span>${message}</span>
        <button class="close-toast" aria-label="알림 닫기">✕</button>
    `;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive'); // 스크린 리더가 즉시 알림을 읽도록 설정

    const closeButton = toast.querySelector('.close-toast');
    const closeToast = () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300); // 애니메이션 후 DOM에서 제거
    };

    // 토스트 클릭 시 닫기
    toast.addEventListener('click', closeToast);
    closeButton.addEventListener('click', closeToast); // 닫기 버튼 클릭 시 닫기

    document.body.appendChild(toast);

    // 애니메이션을 위해 약간의 지연 후 'show' 클래스 추가
    setTimeout(() => toast.classList.add('show'), 100);
    // 일정 시간 후 자동으로 토스트 닫기
    setTimeout(() => closeToast(), CONSTANTS.TOAST_DURATION);
};

/**
 * messages.json 파일에서 메시지 데이터를 로드합니다.
 * 로딩 상태와 진행률을 사용자에게 표시합니다.
 * @returns {Promise<void>}
 */
const loadMessages = async () => {
    DOM.searchLoading.style.display = 'flex';
    updateProgressBar('20%');

    try {
        const response = await fetch('messages.json', { cache: 'no-store' }); // 캐시 사용 안 함
        updateProgressBar('60%');

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        state.messages = await response.json();
        updateProgressBar('100%');

        // 메시지 로드 후 카테고리 자동 지정 및 텍스트 길이 속성 추가
        state.messages = state.messages.map(msg => ({
            ...msg,
            category: msg.category || categorizeMessage(msg.source),
            textLength: msg.text.length // 텍스트 길이 속성 추가
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
        // 로딩 완료 후 로딩 인디케이터 숨기기
        setTimeout(() => {
            DOM.searchLoading.style.display = 'none';
            updateProgressBar('0', 300); // 진행 바 초기화
        }, 300);
    }
};

/**
 * 메시지 출처 문자열에 따라 적절한 카테고리를 지정합니다.
 * @param {string} source - 메시지의 출처 문자열
 * @returns {string} - 지정된 카테고리 이름 (CATEGORIES 객체에서 정의된 값 중 하나)
 */
const categorizeMessage = (source) => {
    const categories = [
        { key: '천성경', value: CATEGORIES.CHEON_SEONG_GYEONG },
        { key: '참부모경', value: CATEGORIES.CHAM_BUMO_GYEONG },
        { key: '참부모님 말씀', value: CATEGORIES.CHAM_BUMO_NIM },
        { key: '참어머님 말씀', value: CATEGORIES.CHAM_EOMEONIM },
        { key: '천심원', value: CATEGORIES.CHEON_SHIM_WON }
    ];
    // 출처에 포함된 키워드를 찾아 해당하는 카테고리 반환, 없으면 '전체' 반환
    return categories.find(cat => source.includes(cat.key))?.value || CATEGORIES.ALL;
};

/**
 * 텍스트 내에서 검색어를 하이라이트합니다.
 * @param {string} text - 원본 텍스트
 * @param {string} query - 하이라이트할 검색어
 * @returns {string} - 검색어가 `<span class="highlight">` 태그로 감싸진 HTML 텍스트
 */
const highlightText = (text, query) => {
    if (!query) {
        return text;
    }
    try {
        // 특수 문자를 이스케이프하여 정규식 오류 방지
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedQuery, 'gi'); // 대소문자 구분 없이 전역 검색
        return text.replace(regex, match => `<span class="highlight">${match}</span>`);
    } catch (e) {
        console.warn('유효하지 않은 정규식 쿼리:', e);
        return text; // 오류 발생 시 원본 텍스트 반환
    }
};

/**
 * 긴 텍스트를 축약하고, 검색어가 포함된 경우 해당 부분을 보여주며 전체 보기/접기 기능을 제공합니다.
 * @param {string} text - 원본 메시지 텍스트
 * @param {string} query - 검색어 (하이라이트에 사용)
 * @returns {string} - 축약되거나 전체 내용이 포함된 HTML 문자열
 */
const truncateText = (text, query) => {
    // 텍스트 길이가 너무 길지 않으면 축약하지 않음
    if (text.length <= CONSTANTS.MAX_TEXT_LENGTH) {
        return highlightText(text, query);
    }

    // 축약된 텍스트와 전체 텍스트를 담는 HTML 구조 반환
    // truncated-text는 CSS의 line-clamp 속성으로 줄 수를 제한함
    return `
        <span class="truncated-text">${highlightText(text, query)}</span>
        <span class="full-text" style="display: none;">${highlightText(text, query)}</span>
        <button class="toggle-text" onclick="toggleText(this)" aria-expanded="false" aria-label="전체 텍스트 보기">전체 보기</button>
    `;
};

/**
 * "전체 보기" 버튼 클릭 시 텍스트를 확장하거나 축소합니다.
 * @param {HTMLElement} button - 클릭된 토글 버튼 요소
 */
const toggleText = (button) => {
    const resultItem = button.closest('.result-item');
    const truncatedText = resultItem.querySelector('.truncated-text');
    const fullText = resultItem.querySelector('.full-text');
    const isExpanded = button.getAttribute('aria-expanded') === 'true';

    // 텍스트 표시 상태 토글
    truncatedText.style.display = isExpanded ? 'inline' : 'none';
    fullText.style.display = isExpanded ? 'none' : 'inline';

    // 버튼 텍스트와 ARIA 속성 업데이트
    button.textContent = isExpanded ? '전체 보기' : '접기';
    button.setAttribute('aria-expanded', !isExpanded);
    button.setAttribute('aria-label', isExpanded ? '전체 텍스트 보기' : '텍스트 접기');
};

/**
 * "모든 검색 기록 삭제" 버튼의 HTML을 생성합니다.
 * @returns {string} - 버튼의 HTML 문자열
 */
const renderClearAllButton = () => `
    <div class="suggestion clear-all" role="button" tabindex="0" onclick="clearSearchHistory()" aria-label="모든 검색 기록 삭제">
        모든 검색 기록 삭제
    </div>
`;

/**
 * 현재 검색어에 따라 검색 제안 목록을 렌더링하고 표시/숨김을 관리합니다.
 */
const renderSearchSuggestions = () => {
    const query = DOM.searchInput.value.trim().toLowerCase();
    let html = '';

    // 검색어가 있고, 검색 기록이 있는 경우 필터링된 기록 표시
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

    // 검색 기록이 있는 경우 "모든 검색 기록 삭제" 버튼 추가
    if (state.searchHistory.length > 0) {
        html += renderClearAllButton();
    }

    DOM.searchSuggestions.innerHTML = html;
    // 검색 제안 영역 표시 여부 결정
    DOM.searchSuggestions.style.display = state.searchHistory.length > 0 ? 'block' : 'none';
};

/**
 * 특정 검색 기록 항목을 삭제합니다.
 * @param {number} index - 삭제할 검색 기록의 인덱스
 */
const deleteSearchHistory = (index) => {
    state.searchHistory.splice(index, 1); // 배열에서 항목 제거
    localStorage.setItem('searchHistory', JSON.stringify(state.searchHistory)); // localStorage 업데이트
    renderSearchSuggestions(); // 검색 제안 목록 다시 렌더링
    showToast('검색 기록이 삭제되었습니다.');
};

/**
 * 모든 검색 기록을 삭제합니다.
 */
const clearSearchHistory = () => {
    state.searchHistory = []; // 검색 기록 초기화
    localStorage.setItem('searchHistory', JSON.stringify(state.searchHistory)); // localStorage 업데이트
    DOM.searchSuggestions.style.display = 'none'; // 검색 제안 영역 숨김
    showToast('모든 검색 기록이 삭제되었습니다.');
};

/**
 * 검색 제안 항목을 선택하고, 해당 검색어로 메시지를 검색합니다.
 * @param {string} query - 선택된 검색어
 */
const selectSuggestion = (query) => {
    DOM.searchInput.value = query; // 검색 입력 필드에 값 설정
    DOM.searchSuggestions.style.display = 'none'; // 검색 제안 숨김
    searchMessages(); // 메시지 검색 실행
};

/**
 * 랜덤 말씀을 생성하여 표시합니다.
 */
const generateRandomMessage = () => {
    if (state.messages.length === 0) {
        showToast('로딩된 말씀이 없습니다. 잠시 후 다시 시도해주세요.');
        return;
    }

    // 현재 필터링된 메시지 중에서 랜덤 선택 (검색어나 카테고리 적용)
    let availableMessages = state.messages;
    const query = DOM.searchInput.value.trim();

    if (state.currentCategory !== CATEGORIES.ALL) {
        availableMessages = availableMessages.filter(msg => msg.category === state.currentCategory);
    }
    if (query) {
        availableMessages = availableMessages.filter(msg => msg.text.toLowerCase().includes(query.toLowerCase()));
    }

    if (availableMessages.length === 0) {
        showToast('현재 조건에 맞는 랜덤 말씀이 없습니다.');
        return;
    }

    const randomIndex = Math.floor(Math.random() * availableMessages.length);
    const randomMessage = availableMessages[randomIndex];

    DOM.searchResults.innerHTML = `
        <div class="result-item random-message" role="listitem" tabindex="0">
            <h3><i class="fas fa-book" aria-hidden="true"></i> ${randomMessage.category}</h3>
            <p>${highlightText(randomMessage.text, query)}</p>
            <p class="source"><i class="fas fa-bookmark" aria-hidden="true"></i> ${randomMessage.source}</p>
            <button class="copy-button"
                    onclick="copyMessageToClipboard(
                        '${randomMessage.text.replace(/'/g, "\\'")}',
                        '${randomMessage.source.replace(/'/g, "\\'")}',
                        '${randomMessage.category.replace(/'/g, "\\'")}',
                        this.closest('.result-item')
                    )"
                    aria-label="${randomMessage.category} 말씀과 출처 복사">
                <i class="fas fa-copy" aria-hidden="true"></i> 복사하기
            </button>
            <button class="quiz-button blue" onclick="generateRandomMessage()" style="margin-top: 10px;">
                <i class="fas fa-random" aria-hidden="true"></i> 다른 랜덤 말씀 보기
            </button>
        </div>
    `;
    DOM.searchResults.style.display = 'flex';
    DOM.searchStats.style.display = 'none';
    scrollToResultsTop(); // 랜덤 말씀 생성 후 결과 상단으로 스크롤
    showToast('새로운 랜덤 말씀을 불러왔습니다!');
};


/**
 * 사용자 입력 또는 카테고리 선택에 따라 메시지를 검색하고 결과를 표시합니다.
 * 검색 결과는 페이지네이션이 적용됩니다.
 * @param {number} [page=1] - 현재 페이지 번호 (기본값: 1)
 */
const searchMessages = debounce((page = 1) => {
    const query = DOM.searchInput.value.trim();
    DOM.searchLoading.style.display = 'flex'; // 로딩 표시
    updateProgressBar('20%'); // 진행 바 업데이트
    DOM.searchResults.innerHTML = ''; // 이전 결과 초기화
    DOM.searchResults.style.display = 'none';
    DOM.searchStats.style.display = 'none';
    state.currentPage = page; // 현재 페이지 상태 업데이트

    let filteredMessages = state.messages;

    // 카테고리 필터링
    if (state.currentCategory !== CATEGORIES.ALL) {
        filteredMessages = filteredMessages.filter(msg => msg.category === state.currentCategory);
    }

    // 검색어 필터링 및 일치 횟수 계산
    if (query) {
        const queryRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        filteredMessages = filteredMessages.map(msg => ({
            ...msg,
            matchCount: (msg.text.match(queryRegex) || []).length // 일치 횟수 계산
        })).filter(msg => msg.text.toLowerCase().includes(query.toLowerCase()));

        // 검색어 일치 횟수 기준 정렬 (기본값)
        filteredMessages.sort((a, b) => b.matchCount - a.matchCount);

        // 검색 기록 업데이트
        if (!state.searchHistory.includes(query)) {
            state.searchHistory.unshift(query); // 가장 최근 검색어를 맨 앞에 추가
            if (state.searchHistory.length > CONSTANTS.MAX_SEARCH_HISTORY) {
                state.searchHistory.pop(); // 최대 개수 초과 시 가장 오래된 것 삭제
            }
            localStorage.setItem('searchHistory', JSON.stringify(state.searchHistory));
        }
    }

    // **정렬 순서 적용**
    switch (state.currentSortOrder) {
        case CONSTANTS.SORT_ORDER.LENGTH_ASC:
            filteredMessages.sort((a, b) => a.textLength - b.textLength); // 길이 짧은순
            break;
        case CONSTANTS.SORT_ORDER.LENGTH_DESC:
            filteredMessages.sort((a, b) => b.textLength - a.textLength); // 길이 긴순
            break;
        // CONSTANTS.SORT_ORDER.DEFAULT (검색 일치 횟수)는 이미 위에서 처리됨
    }


    const startTime = performance.now(); // 검색 시간 측정 시작
    updateProgressBar('60%');

    // 페이지네이션 적용
    const startIndex = (page - 1) * CONSTANTS.RESULTS_PER_PAGE;
    const endIndex = startIndex + CONSTANTS.RESULTS_PER_PAGE;
    const paginatedMessages = filteredMessages.slice(startIndex, endIndex);

    // 검색 결과 표시
    if (filteredMessages.length === 0 && (query || state.currentCategory !== CATEGORIES.ALL)) {
        DOM.searchResults.innerHTML = '<p class="no-results" role="alert">검색 결과가 없습니다.</p>';
        DOM.searchResults.style.display = 'block';
    } else if (paginatedMessages.length > 0) {
        DOM.searchResults.innerHTML = paginatedMessages.map(msg => {
            const displayText = truncateText(msg.text, query); // 텍스트 축약 및 하이라이트
            const matchCount = msg.matchCount || 0; // 일치 횟수
            return `
                <div class="result-item" role="listitem" tabindex="0">
                    <h3><i class="fas fa-book" aria-hidden="true"></i> ${msg.category}</h3>
                    <p>${displayText} ${matchCount > 0 && query ? `<span class="match-count" aria-label="일치 횟수 ${matchCount}회">${matchCount}</span>` : ''}</p>
                    <p class="source"><i class="fas fa-bookmark" aria-hidden="true"></i> ${msg.source}</p>
                    <button class="copy-button"
                            onclick="copyMessageToClipboard(
                                '${msg.text.replace(/'/g, "\\'")}',
                                '${msg.source.replace(/'/g, "\\'")}',
                                '${msg.category.replace(/'/g, "\\'")}',
                                this.closest('.result-item')
                            )"
                            aria-label="${msg.category} 말씀과 출처 복사">
                        <i class="fas fa-copy" aria-hidden="true"></i> 복사하기
                    </button>
                </div>
            `;
        }).join('');

        // 다음 페이지 버튼 추가
        if (filteredMessages.length > endIndex) {
            DOM.searchResults.innerHTML += `
                <button onclick="searchMessages(${page + 1})" class="quiz-button blue next-page-button" aria-label="다음 페이지">다음 페이지</button>
            `;
        }
        // 검색 결과 맨 위로 이동 버튼 추가
        DOM.searchResults.innerHTML += `
            <button class="back-to-top result-top" onclick="scrollToResultsTop()" aria-label="검색 결과 맨 위로 이동" style="position: static; margin: 1rem auto; display: block;">
                <i class="fas fa-arrow-up" aria-hidden="true"></i> 맨 위로
            </button>
        `;
        DOM.searchResults.style.display = 'flex';
        DOM.searchResults.setAttribute('aria-live', 'polite'); // 스크린 리더에게 내용 변경 알림
    }

    const endTime = performance.now(); // 검색 시간 측정 종료
    DOM.searchStats.style.display = 'block';
    DOM.searchStats.innerHTML = `총 ${filteredMessages.length}개의 결과 (검색 시간: ${(endTime - startTime).toFixed(2)}ms)`;
    DOM.searchLoading.style.display = 'none'; // 로딩 표시 숨기기
    updateProgressBar('100%');
    setTimeout(() => updateProgressBar('0'), 300); // 진행 바 초기화
}, CONSTANTS.DEBOUNCE_DELAY); // 디바운스 적용

/**
 * 검색 입력 필드와 현재 선택된 카테고리를 초기화합니다.
 */
const clearSearch = () => {
    DOM.searchInput.value = ''; // 검색 입력 필드 비우기
    state.currentCategory = CATEGORIES.ALL; // 카테고리 '전체'로 초기화
    localStorage.setItem('currentCategory', state.currentCategory); // localStorage 업데이트

    // 카테고리 버튼의 활성 상태 초기화
    DOM.categoryButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-category') === CATEGORIES.ALL);
        btn.setAttribute('aria-current', btn.getAttribute('data-category') === CATEGORIES.ALL ? 'true' : 'false');
    });

    // 정렬 순서 초기화
    state.currentSortOrder = CONSTANTS.SORT_ORDER.DEFAULT;
    if (DOM.sortSelect) {
        DOM.sortSelect.value = CONSTANTS.SORT_ORDER.DEFAULT;
    }

    // 검색 결과 및 통계, 제안 숨기기
    DOM.searchResults.innerHTML = '';
    DOM.searchResults.style.display = 'none';
    DOM.searchStats.style.display = 'none';
    DOM.searchSuggestions.style.display = 'none';

    // 검색 초기화 버튼에 애니메이션 효과 추가
    DOM.clearSearch?.classList.add('shake');
    setTimeout(() => DOM.clearSearch?.classList.remove('shake'), 300);

    searchMessages(); // 메시지 검색 다시 실행 (초기화된 상태로)
};

/**
 * 지정된 페이지를 활성화하고 다른 페이지는 비활성화합니다.
 * @param {string} pageId - 활성화할 페이지의 ID (예: 'home', 'workbook')
 */
const showPage = (pageId) => {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelector(`#${pageId}`).classList.add('active');

    // 네비게이션 버튼의 활성 상태 업데이트
    DOM.navButtons.forEach(button => {
        button.classList.toggle('active', button.getAttribute('data-page') === pageId);
        button.setAttribute('aria-current', button.getAttribute('data-page') === pageId ? 'page' : 'false');
    });

    // 'workbook' 페이지로 이동 시 메시지 로드 및 검색 실행
    if (pageId === CONSTANTS.PAGES.WORKBOOK) {
        loadMessages().then(() => searchMessages());
    }
};

/**
 * 지정된 퀴즈 유형에 해당하는 퀴즈 페이지로 이동합니다.
 * @param {string} quizType - 시작할 퀴즈의 유형 (예: '원리강론', '성경')
 */
const startQuiz = (quizType) => {
    const url = QUIZ_PAGES[quizType];
    if (url) {
        window.location.href = url; // 해당 퀴즈 페이지로 리디렉션
    } else {
        console.error('유효하지 않은 퀴즈 유형:', quizType);
        showToast('퀴즈를 시작할 수 없습니다. 다시 시도하세요.');
    }
};

/**
 * 애플리케이션의 초기 설정을 수행하고 이벤트 리스너를 등록합니다.
 */
const initializeApp = () => {
    // 초기 카테고리 버튼 활성화
    const initialCategoryButton = document.querySelector(`.category-container button[data-category="${state.currentCategory}"]`);
    if (initialCategoryButton) {
        initialCategoryButton.classList.add('active');
        initialCategoryButton.setAttribute('aria-current', 'true');
    }

    // 네비게이션 버튼 클릭 이벤트 리스너
    DOM.navButtons.forEach(button => {
        button.addEventListener('click', () => showPage(button.getAttribute('data-page')));
    });

    // 카테고리 버튼 클릭 이벤트 리스너
    DOM.categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 모든 카테고리 버튼의 활성 상태 제거
            DOM.categoryButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-current', 'false');
            });
            // 클릭된 버튼 활성화
            this.classList.add('active');
            this.setAttribute('aria-current', 'true');
            state.currentCategory = this.getAttribute('data-category'); // 현재 카테고리 상태 업데이트
            localStorage.setItem('currentCategory', state.currentCategory); // localStorage 업데이트
            searchMessages(); // 메시지 검색 다시 실행
        });
    });

    // 검색 입력 필드 이벤트 리스너
    DOM.searchInput.addEventListener('input', renderSearchSuggestions); // 입력 시 제안 렌더링
    DOM.searchInput.addEventListener('focus', renderSearchSuggestions); // 포커스 시 제안 렌더링
    // 블러 시 제안 숨기기 (약간의 딜레이를 주어 클릭 이벤트 처리 가능하게 함)
    DOM.searchInput.addEventListener('blur', () => {
        setTimeout(() => DOM.searchSuggestions.style.display = 'none', 200);
    });
    // Enter 키 입력 시 검색 실행
    DOM.searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            searchMessages();
            DOM.searchSuggestions.style.display = 'none'; // Enter 시 제안 숨김
        }
    });

    // 검색 제안 목록 키보드 내비게이션
    DOM.searchSuggestions.addEventListener('keydown', e => {
        const suggestions = DOM.searchSuggestions.querySelectorAll('.suggestion');
        if (suggestions.length === 0) return;

        const currentIndex = Array.from(suggestions).findIndex(s => s === document.activeElement);
        let nextIndex = currentIndex;

        if (e.key === 'ArrowDown') {
            nextIndex = (currentIndex + 1) % suggestions.length;
            e.preventDefault(); // 스크롤 방지
        } else if (e.key === 'ArrowUp') {
            nextIndex = (currentIndex - 1 + suggestions.length) % suggestions.length;
            e.preventDefault(); // 스크롤 방지
        } else if (e.key === 'Enter' && currentIndex >= 0) {
            // 선택된 제안 클릭 효과
            selectSuggestion(suggestions[currentIndex].querySelector('span')?.textContent || suggestions[currentIndex].textContent);
            e.preventDefault();
        } else if (e.key === 'Delete' && currentIndex >= 0) {
            // 선택된 제안 삭제
            const textContent = suggestions[currentIndex].querySelector('span')?.textContent || suggestions[currentIndex].textContent;
            const index = state.searchHistory.indexOf(textContent);
            if (index !== -1) {
                deleteSearchHistory(index);
            }
            e.preventDefault();
        }

        if (nextIndex !== currentIndex) {
            suggestions[nextIndex].focus(); // 다음/이전 제안으로 포커스 이동
        }
    });

    // 검색 결과 항목 키보드 내비게이션 (상하 방향키)
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

    // 스크롤 이벤트 리스너 (맨 위로 버튼 표시/숨김)
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            if (DOM.backToTop) {
                // 스크롤 위치에 따라 버튼 표시 여부 결정
                DOM.backToTop.style.display = window.scrollY > 300 ? 'flex' : 'none';
                // 애니메이션을 위한 클래스 토글
                if (window.scrollY > 300) {
                    DOM.backToTop.classList.add('show');
                } else {
                    DOM.backToTop.classList.remove('show');
                }
            }
        }, 100); // 디바운스 적용
    });

    // 전역 키보드 단축키 설정
    document.addEventListener('keydown', e => {
        // Ctrl + /: 검색 입력 필드 포커스
        if (e.ctrlKey && e.key === '/') {
            e.preventDefault();
            DOM.searchInput.focus();
        }
        // Ctrl + Enter: 검색 실행
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            searchMessages();
        }
        // Ctrl + Backspace: 검색 초기화
        if (e.ctrlKey && e.key === 'Backspace') {
            e.preventDefault();
            clearSearch();
        }
    });

    // 모든 버튼에 Enter 또는 Space 키로 클릭 이벤트 발생하도록 처리 (접근성)
    document.querySelectorAll('button').forEach(element => {
        element.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                element.click();
            }
        });
    });

    // 검색 초기화 버튼 클릭 이벤트
    if (DOM.clearSearch) {
        DOM.clearSearch.addEventListener('click', clearSearch);
    }

    // **정렬 드롭다운 변경 이벤트**
    if (DOM.sortSelect) {
        DOM.sortSelect.addEventListener('change', (event) => {
            state.currentSortOrder = event.target.value;
            searchMessages(); // 정렬 순서 변경 시 메시지 재검색
        });
    }

    // **랜덤 말씀 보기 버튼 클릭 이벤트**
    if (DOM.randomMessageButton) {
        DOM.randomMessageButton.addEventListener('click', generateRandomMessage);
    }

    // localStorage에서 다크 모드 설정 로드
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
    }

    // 애플리케이션 시작 시 기본 페이지 표시
    showPage(CONSTANTS.PAGES.HOME);
};

// DOMContentLoaded 이벤트 발생 시 initializeApp 함수 실행
document.addEventListener('DOMContentLoaded', initializeApp);