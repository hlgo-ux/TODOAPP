// 로컬 스토리지 키
const STORAGE_KEY = 'todoList';

// 카테고리 정보 정의
const CATEGORIES = {
  work: { label: '업무', className: 'work' },
  personal: { label: '개인', className: 'personal' },
  study: { label: '공부', className: 'study' }
};

// 카테고리 자동 분류 키워드 (각 카테고리별 5개 이내)
const CATEGORY_KEYWORDS = {
  work: ['회의', '보고서', '업무', '메일', '기획'],
  personal: ['운동', '쇼핑', '병원', '약속', '청소'],
  study: ['공부', '강의', '독서', '시험', '과제']
};

// DOM 요소
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const categorySelect = document.getElementById('category-select');
const searchInput = document.getElementById('search-input');
const filterButtons = document.querySelectorAll('.filter-btn');
const todoList = document.getElementById('todo-list');
const progressText = document.getElementById('progress-text');
const progressBar = document.getElementById('progress-bar');
const clearCompletedBtn = document.getElementById('clear-completed-btn');

// 할 일 데이터 배열 및 필터/검색 상태
let todos = [];
let currentFilter = 'all';
let searchQuery = '';

// localStorage에서 데이터 불러오기 (기존 데이터는 카테고리를 '개인'으로 처리)
function loadTodos() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    todos = parsed.map((todo) => ({
      ...todo,
      category: todo.category || 'personal'
    }));
  } catch (error) {
    todos = [];
  }
}

// localStorage에 데이터 저장하기
function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

// 진행률 업데이트 함수 (전체 할 일 기준)
function updateProgress() {
  const total = todos.length;
  const completedCount = todos.filter((todo) => todo.completed).length;
  const percentage = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  progressText.textContent = `${completedCount}/${total} 완료 (${percentage}%)`;
  progressBar.style.width = `${percentage}%`;
}

// 화면에 할 일 목록 렌더링하기
function renderTodos() {
  todoList.innerHTML = '';

  // 카테고리 필터 및 검색어 필터링 적용
  const filteredTodos = todos.filter((todo) => {
    const matchesCategory = currentFilter === 'all' || todo.category === currentFilter;
    const matchesSearch = todo.title.toLowerCase().includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  // 표시할 항목이 없을 때 빈 상태 메시지 표시
  if (filteredTodos.length === 0) {
    const emptyLi = document.createElement('li');
    emptyLi.className = 'empty-state';
    emptyLi.textContent = '할 일이 없습니다. 추가해보세요!';
    todoList.appendChild(emptyLi);
    updateProgress();
    return;
  }

  filteredTodos.forEach((todo) => {
    const li = document.createElement('li');
    li.className = `todo-item${todo.completed ? ' completed' : ''}`;

    // 체크박스, 텍스트, 카테고리 태그 영역
    const content = document.createElement('div');
    content.className = 'todo-content';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked = todo.completed;
    checkbox.addEventListener('change', () => toggleTodo(todo.id));

    const span = document.createElement('span');
    span.className = 'todo-text';
    span.textContent = todo.title;
    span.title = '더블클릭하여 수정';

    // 텍스트 더블클릭 시 인라인 수정 입력창 전환
    span.addEventListener('dblclick', () => {
      if (li.classList.contains('editing')) return;
      li.classList.add('editing');

      const editInput = document.createElement('input');
      editInput.type = 'text';
      editInput.className = 'edit-input';
      editInput.value = todo.title;

      content.replaceChild(editInput, span);
      editInput.focus();
      editInput.select();

      let isHandled = false;

      // 수정 저장 함수 (Enter)
      const saveEdit = () => {
        if (isHandled) return;
        isHandled = true;
        const trimmed = editInput.value.trim();
        if (trimmed && trimmed !== todo.title) {
          todo.title = trimmed;
          saveTodos();
        }
        renderTodos();
      };

      // 수정 취소 함수 (ESC 또는 외부 클릭)
      const cancelEdit = () => {
        if (isHandled) return;
        isHandled = true;
        renderTodos();
      };

      // 키보드 이벤트 (Enter로 저장, ESC로 취소)
      editInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          saveEdit();
        } else if (e.key === 'Escape') {
          cancelEdit();
        }
      });

      editInput.addEventListener('blur', () => {
        cancelEdit();
      });
    });

    // 카테고리 색상 태그
    const catInfo = CATEGORIES[todo.category] || CATEGORIES.personal;
    const tag = document.createElement('span');
    tag.className = `category-tag ${catInfo.className}`;
    tag.textContent = catInfo.label;

    content.appendChild(checkbox);
    content.appendChild(span);
    content.appendChild(tag);

    // 삭제 버튼 (X)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.type = 'button';
    deleteBtn.textContent = '✕';
    deleteBtn.setAttribute('aria-label', '삭제');
    deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

    li.appendChild(content);
    li.appendChild(deleteBtn);
    todoList.appendChild(li);
  });

  // 진행률 바 및 텍스트 갱신
  updateProgress();
}

// 키워드 기반 카테고리 자동 선택 함수
function detectCategory(title, fallbackCategory) {
  const lowerTitle = title.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => lowerTitle.includes(keyword.toLowerCase()))) {
      return category;
    }
  }
  return fallbackCategory;
}

// 할 일 추가
function addTodo(title, category) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return;
  }

  // 입력 내용 키워드로 카테고리 자동 선택 (일치 키워드가 없으면 사용자가 선택한 카테고리 사용)
  const finalCategory = detectCategory(trimmedTitle, category || 'work');

  const newTodo = {
    id: Date.now().toString(),
    title: trimmedTitle,
    category: finalCategory,
    completed: false,
    createdAt: new Date().toISOString()
  };

  todos.unshift(newTodo);
  saveTodos();
  renderTodos();
}

// 완료 상태 토글
function toggleTodo(id) {
  todos = todos.map((todo) => {
    if (todo.id === id) {
      return { ...todo, completed: !todo.completed };
    }
    return todo;
  });
  saveTodos();
  renderTodos();
}

// 개별 할 일 삭제
function deleteTodo(id) {
  todos = todos.filter((todo) => todo.id !== id);
  saveTodos();
  renderTodos();
}

// 완료 항목 일괄 삭제 (삭제 전 확인 창 표시)
clearCompletedBtn.addEventListener('click', () => {
  if (confirm('완료된 항목을 모두 삭제하시겠습니까?')) {
    todos = todos.filter((todo) => !todo.completed);
    saveTodos();
    renderTodos();
  }
});

// 검색어 입력 시 즉시 필터링
searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value.trim().toLowerCase();
  renderTodos();
});

// 필터 버튼 클릭 이벤트 설정
filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    filterButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTodos();
  });
});

// 입력 내용 키워드 감지 시 카테고리 드롭다운 자동 변경
todoInput.addEventListener('input', () => {
  const detected = detectCategory(todoInput.value, null);
  if (detected) {
    categorySelect.value = detected;
  }
});

// 폼 제출 이벤트 처리 (Enter 키 및 버튼 클릭 지원)
todoForm.addEventListener('submit', (e) => {
  e.preventDefault();
  addTodo(todoInput.value, categorySelect.value);
  todoInput.value = '';
  todoInput.focus();
});

// 초기 데이터 로드 및 렌더링
loadTodos();
renderTodos();
