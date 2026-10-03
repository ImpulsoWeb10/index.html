// Substitua pela URL gerada no seu Google Apps Script (Conforme instrução anterior)
const SHEET_URL = 'SUA_URL_DE_API_DO_GOOGLE_SHEETS_AQUI';

let produtosGlobal = [];
let carrinho = [];

async function carregarCardapio() {
    try {
        const resposta = await fetch(SHEET_URL);
        const dados = await resposta.json();
        
        // Filtra apenas disponíveis e ordena
        produtosGlobal = dados.filter(p => String(p.disponivel).toUpperCase() === 'SIM');
        produtosGlobal.sort((a, b) => parseInt(a.ordem || 0) - parseInt(b.ordem || 0));

        renderizarCardsCategorias(produtosGlobal);
    } catch (error) {
        console.error("Erro ao carregar dados do Google Sheets:", error);
        document.getElementById('cards-categorias-container').innerHTML = 
            '<p style="text-align:center; color: #666;">Carregando cardápio ou verifique a conexão com a planilha...</p>';
    }
}

function renderizarCardsCategorias(produtos) {
    const container = document.getElementById('cards-categorias-container');
    const categoriasUnicas = [...new Set(produtos.map(p => p.categoria))];
    
    // Classes de cores customizadas para simular o design de aplicativo elegante
    const estilosCards = ['card-pizzas', 'card-esfihas', 'card-bebidas'];

    container.innerHTML = categoriasUnicas.map((cat, index) => {
        const estilo = estilosCards[index % estilosCards.length];
        return `
            <div class="card-categoria ${estilo}" onclick="abrirCategoria('${cat}')">
                <div class="card-info">
                    <h3>${cat}</h3>
                    <p>Toque para ver as opções disponíveis</p>
                    <div class="badge-botoes">
                        <span class="badge-subcat">Ver Cardápio</span>
                    </div>
                </div>
                <div class="card-seta">
                    <i class="fa-solid fa-arrow-right"></i>
                </div>
            </div>
        `;
    }).join('');
}

function abrirCategoria(categoriaNome) {
    document.getElementById('cards-categorias-container').style.display = 'none';
    const secaoProdutos = document.getElementById('produtos-secao');
    secaoProdutos.classList.remove('hidden');
    
    document.getElementById('titulo-categoria-atual').innerText = categoriaNome;

    const produtosFiltrados = produtosGlobal.filter(p => p.categoria === categoriaNome);
    const grid = document.getElementById('cardapio-grid');

    grid.innerHTML = produtosFiltrados.map(p => `
        <div class="produto-card">
            <img src="${p.foto}" alt="${p.nome}" class="produto-img">
            <div class="produto-detalhes">
                <h4>${p.nome}</h4>
                <p>${p.descricao}</p>
                <div class="produto-preco-acao">
                    <span class="preco">R$ ${parseFloat(p.preco).toFixed(2)}</span>
                    <button class="btn-add-prod" onclick="adicionarCarrinho('${p.id}')">Adicionar</button>
                </div>
            </div>
        </div>
    `).join('');
}

function voltarParaInicio() {
    document.getElementById('produtos-secao').classList.add('hidden');
    document.getElementById('cards-categorias-container').style.display = 'flex';
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

function finalizarPedidoWhatsapp() {
    let texto = "Olá! Gostaria de fazer o seguinte pedido:%0A%0A";
    let total = 0;

    carrinho.forEach(item => {
        texto += `• ${item.nome} - R$ ${parseFloat(item.preco).toFixed(2)}%0A`;
        total += parseFloat(item.preco);
    });

    texto += `%0A*Total do Pedido: R$ ${total.toFixed(2)}*`;

    // Número do WhatsApp oficial fornecido
    const telefone = "5511954950044";
    window.open(`https://wa.me/${telefone}?text=${texto}`, '_blank');
}

function mostrarPedidos() {
    alert("Seu carrinho atual possui " + carrinho.length + " item(ns). Clique no botão flutuante para enviar ao WhatsApp!");
}

// Inicializa o app carregando da planilha
carregarCardapio();
