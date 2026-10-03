const SHEET_URL = 'SUA_URL_DE_API_DO_GOOGLE_SHEETS_AQUI';

let produtosGlobal = [];
let carrinho = [];

async function carregarCardapio() {
    try {
        const resposta = await fetch(SHEET_URL);
        const dados = await resposta.json();
        
        produtosGlobal = dados.filter(p => String(p.disponivel).toUpperCase() === 'SIM');
        produtosGlobal.sort((a, b) => parseInt(a.ordem || 0) - parseInt(b.ordem || 0));

        renderizarCardsHome(produtosGlobal);
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
        document.getElementById('cards-principais-container').innerHTML = 
            '<p style="text-align:center; color:#666; padding: 20px;">Carregando cardápio ou configure a URL da planilha...</p>';
    }
}

function renderizarCardsHome(produtos) {
    const container = document.getElementById('cards-principais-container');
    const categoriasMap = {};
    
    produtos.forEach(p => {
        if (!categoriasMap[p.categoria]) {
            categoriasMap[p.categoria] = new Set();
        }
        if (p.subcategoria) {
            categoriasMap[p.categoria].add(p.subcategoria);
        }
    });

    const temasCards = ['card-theme-1', 'card-theme-2', 'card-theme-3'];
    const iconesCards = {
        'Pizzas': 'fa-pizza-slice',
        'Esfihas': 'fa-bread-slice',
        'Bebidas': 'fa-wine-glass'
    };

    let htmlCards = '';
    let index = 0;

    for (const [categoria, subcategorias] of Object.entries(categoriasMap)) {
        const temaCls = temasCards[index % temasCards.length];
        const iconeCls = iconesCards[categoria] || 'fa-utensils';

        let subBotoesHtml = '';
        subcategorias.forEach(sub => {
            subBotoesHtml += `<button class="subcat-btn" onclick="abrirSubcategoria('${categoria}', '${sub}')">${sub}</button>`;
        });

        if (subcategorias.size === 0) {
            subBotoesHtml = `<button class="subcat-btn" onclick="abrirSubcategoria('${categoria}', '')">Ver Todos</button>`;
        }

        htmlCards += `
            <div class="app-card ${temaCls}">
                <div class="card-top-content">
                    <div class="card-info">
                        <h3>${categoria}</h3>
                        <p>Escolha entre nossas opções exclusivas.</p>
                    </div>
                    <div class="card-icon-circle">
                        <i class="fa-solid ${iconeCls}"></i>
                    </div>
                </div>
                <div class="card-subcategorias">
                    ${subBotoesHtml}
                </div>
            </div>
        `;
        index++;
    }

    container.innerHTML = htmlCards;
}

function abrirSubcategoria(categoria, subcategoria) {
    document.getElementById('view-home').classList.add('hidden');
    document.getElementById('view-produtos').classList.remove('hidden');

    const titulo = subcategoria ? `${categoria} - ${subcategoria}` : categoria;
    document.getElementById('titulo-secao-produtos').innerText = titulo;

    const filtrados = produtosGlobal.filter(p => {
        if (subcategoria) {
            return p.categoria === categoria && p.subcategoria === subcategoria;
        }
        return p.categoria === categoria;
    });

    const listaDiv = document.getElementById('lista-produtos');
    listaDiv.innerHTML = filtrados.map(p => `
        <div class="produto-item-card">
            <img src="${p.foto}" alt="${p.nome}" class="produto-img">
            <div class="produto-detalhes">
                <h4>${p.nome}</h4>
                <p>${p.descricao}</p>
                <div class="preco-e-botao">
                    <span class="preco-prod">R$ ${parseFloat(p.preco).toFixed(2)}</span>
                    <button class="btn-add" onclick="adicionarCarrinho('${p.id}')">Adicionar</button>
                </div>
            </div>
        </div>
    `).join('');
}

function voltarParaHome() {
    document.getElementById('view-produtos').classList.add('hidden');
    document.getElementById('view-home').classList.remove('hidden');
}

function adicionarCarrinho(id) {
    const produto = produtosGlobal.find(p => p.id == id);
    if (produto) {
        carrinho.push(produto);
        atualizarCarrinhoUI();
    }
}

function atualizarCarrinhoUI() {
    const carrinhoDiv = document.getElementById('carrinho-flutuante');
    const contador = document.getElementById('contador-carrinho');
    const totalSpan = document.getElementById('valor-total');

    if (carrinho.length > 0) {
        carrinhoDiv.classList.remove('hidden');
        contador.innerText = carrinho.length;
        const total = carrinho.reduce((acc, item) => acc + parseFloat(item.preco), 0);
        totalSpan.innerText = `R$ ${total.toFixed(2)}`;
    } else {
        carrinhoDiv.classList.add('hidden');
    }
}

function verPedidosCarrinho() {
    if (carrinho.length === 0) {
        alert("Seu carrinho está vazio. Escolha alguns produtos no cardápio!");
    } else {
        finalizarPedidoWhatsapp();
    }
}

function finalizarPedidoWhatsapp() {
    let texto = "Olá! Gostaria de fazer o seguinte pedido:%0A%0A";
    let total = 0;

    carrinho.forEach(item => {
        texto += `• ${item.nome} - R$ ${parseFloat(item.preco).toFixed(2)}%0A`;
        total += parseFloat(item.preco);
    });

    texto += `%0A*Total: R$ ${total.toFixed(2)}*`;

    const telefone = "5511954950044";
    window.open(`https://wa.me/${telefone}?text=${texto}`, '_blank');
}

carregarCardapio();
