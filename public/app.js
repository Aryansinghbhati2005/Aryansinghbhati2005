const state = {
  selectedCategory: 'All',
  query: ''
};

const els = {
  hero: document.getElementById('hero'),
  categories: document.getElementById('categories'),
  productsGrid: document.getElementById('productsGrid'),
  cartItems: document.getElementById('cartItems'),
  cartTotal: document.getElementById('cartTotal'),
  cartCount: document.getElementById('cartCount'),
  categoryFilter: document.getElementById('categoryFilter'),
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  cartToggle: document.getElementById('cartToggle'),
  cartPanel: document.getElementById('cartPanel')
};

async function loadHome() {
  const res = await fetch('/api/home');
  const data = await res.json();

  els.hero.innerHTML = `
    <h1>${data.hero.title}</h1>
    <p>${data.hero.subtitle}</p>
    <button class="cart-btn">${data.hero.cta}</button>
  `;

  els.categories.innerHTML = '';
  els.categoryFilter.innerHTML = '<option>All</option>';

  data.categories.forEach(category => {
    const pill = document.createElement('button');
    pill.className = 'cat-pill';
    pill.textContent = category;
    pill.addEventListener('click', () => {
      state.selectedCategory = category;
      els.categoryFilter.value = category;
      loadProducts();
    });
    els.categories.appendChild(pill);

    const option = document.createElement('option');
    option.textContent = category;
    els.categoryFilter.appendChild(option);
  });
}

function renderProducts(products) {
  if (!products.length) {
    els.productsGrid.innerHTML = '<p>No products matched your search.</p>';
    return;
  }

  els.productsGrid.innerHTML = products
    .map(
      product => `
      <article class="product-card">
        <img src="${product.image}" alt="${product.name}" loading="lazy" />
        <div class="product-body">
          <span class="badge">${product.badge}</span>
          <h4>${product.name}</h4>
          <p>⭐ ${product.rating} • ${product.category}</p>
          <div class="price">
            <strong>₹${product.price}</strong>
            <span class="old">₹${product.oldPrice}</span>
          </div>
          <button data-id="${product.id}">Add to Cart</button>
        </div>
      </article>
    `
    )
    .join('');

  document.querySelectorAll('.product-card button').forEach(button => {
    button.addEventListener('click', async () => {
      await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: Number(button.dataset.id) })
      });
      loadCart();
    });
  });
}

async function loadProducts() {
  const params = new URLSearchParams();
  if (state.selectedCategory && state.selectedCategory !== 'All') {
    params.set('category', state.selectedCategory);
  }
  if (state.query) {
    params.set('q', state.query);
  }

  const res = await fetch(`/api/products?${params.toString()}`);
  const data = await res.json();
  renderProducts(data.products);
}

async function loadCart() {
  const res = await fetch('/api/cart');
  const data = await res.json();

  els.cartItems.innerHTML = data.items.length
    ? data.items
        .map(
          item => `
      <div class="cart-item">
        <p><strong>${item.product.name}</strong></p>
        <p>Qty: ${item.qty} × ₹${item.product.price}</p>
        <button data-remove="${item.productId}">Remove</button>
      </div>
    `
        )
        .join('')
    : '<p>Your cart is empty.</p>';

  els.cartTotal.textContent = data.total;
  const count = data.items.reduce((sum, item) => sum + item.qty, 0);
  els.cartCount.textContent = count;

  document.querySelectorAll('[data-remove]').forEach(button => {
    button.addEventListener('click', async () => {
      await fetch(`/api/cart/${button.dataset.remove}`, { method: 'DELETE' });
      loadCart();
    });
  });
}

els.categoryFilter.addEventListener('change', () => {
  state.selectedCategory = els.categoryFilter.value;
  loadProducts();
});

els.searchBtn.addEventListener('click', () => {
  state.query = els.searchInput.value.trim();
  loadProducts();
});

els.searchInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    state.query = els.searchInput.value.trim();
    loadProducts();
  }
});

els.cartToggle.addEventListener('click', () => {
  els.cartPanel.style.display = els.cartPanel.style.display === 'none' ? 'block' : 'none';
});

async function init() {
  await loadHome();
  await Promise.all([loadProducts(), loadCart()]);
}

init();
