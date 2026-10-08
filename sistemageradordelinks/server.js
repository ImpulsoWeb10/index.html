const express = require('express');
const session = require('express-session');
const multer = require('multer');
const QRCode = require('qrcode');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database', 'clientes.json');

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'impulso_web_10_secret_key_2026',
    resave: false,
    saveUninitialized: true
}));

// Servir arquivos estáticos da raiz, clientes e uploads
app.use(express.static(__dirname));
app.use('/clientes', express.static(path.join(__dirname, 'clientes')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rota principal servindo o index.html da raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Configuração Upload Logo
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'uploads', 'logos');
        fs.ensureDirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `logo_${Date.now()}${ext}`);
    }
});
const upload = multer({ storage });

// Helper: Slugify
function slugify(text) {
    return text.toString().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

// Inicializar banco JSON
if (!fs.existsSync(DB_FILE)) {
    fs.ensureDirSync(path.join(__dirname, 'database'));
    fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

// Rota Gerar Frase SEO
app.post('/api/gerar-seo', (req, res) => {
    const { nome_empresa, segmento, cidade, produtos } = req.body;
    const prods = produtos ? ` Especialista em ${produtos}.` : '';
    const frase = `${nome_empresa} em ${cidade}: ${segmento} de alta qualidade.${prods} Atendimento rápido e excelência em serviços na região.`;
    res.json({ frase });
});

// Rota Principal: Criar / Gerar Cliente Completo
app.post('/api/clientes/gerar', upload.single('logo_file'), async (req, res) => {
    try {
        const data = req.body;
        const slug = slugify(data.nome_empresa);
        const clienteDir = path.join(__dirname, 'clientes', slug);
        await fs.ensureDir(clienteDir);

        // Processar Logo
        let logoFileName = 'logo.png';
        if (req.file) {
            const ext = path.extname(req.file.originalname);
            logoFileName = `logo${ext}`;
            const destPath = path.join(clienteDir, logoFileName);
            await fs.copy(req.file.path, destPath);
        }

        // WhatsApp Link
        const cleanPhone = (data.whatsapp || '').replace(/\D/g, '');
        const waMsg = encodeURIComponent(data.mensagem_whatsapp || "Olá! Vim pelo link da empresa.");
        const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waMsg}` : '#';

        // Google Maps Link
        let mapsLink = data.google_maps;
        if (!mapsLink && data.endereco) {
            const query = encodeURIComponent(`${data.endereco}, ${data.cidade || ''} ${data.estado || ''}`);
            mapsLink = `https://www.google.com/maps/search/?api=1&query=${query}`;
        }

        // 1. Gerar QR Code
        const qrPath = path.join(clienteDir, 'qr-code.png');
        await QRCode.toFile(qrPath, data.google_review, {
            width: 500,
            margin: 2,
            color: { dark: data.cor_principal || '#10b981', light: '#ffffff' }
        });

        // 2. Gerar Plaquinha Visual
        const canvas = createCanvas(800, 1200);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, 800, 1200);

        ctx.strokeStyle = data.cor_principal || '#10b981';
        ctx.lineWidth = 10;
        ctx.strokeRect(30, 30, 740, 1140);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 38px Sans-Serif';
        ctx.textAlign = 'center';
        ctx.fillText(data.nome_empresa.toUpperCase(), 400, 120);

        ctx.fillStyle = '#9ca3af';
        ctx.font = '22px Sans-Serif';
        ctx.fillText('Sua opinião é muito importante para nós!', 400, 170);

        ctx.fillStyle = '#f59e0b';
        ctx.font = '40px Sans-Serif';
        ctx.fillText('★ ★ ★ ★ ★', 400, 230);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Sans-Serif';
        ctx.fillText('Avalie nossa empresa no Google', 400, 300);

        const qrImage = await loadImage(qrPath);
        ctx.drawImage(qrImage, 200, 350, 400, 400);

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 24px Sans-Serif';
        ctx.fillText('Aponte a câmera do celular para o QR Code', 400, 820);

        ctx.fillStyle = '#9ca3af';
        ctx.font = '18px Sans-Serif';
        ctx.fillText('Obrigado pela sua preferência e confiança!', 400, 870);

        const plaquinhaPath = path.join(clienteDir, 'plaquinha.png');
        const buffer = canvas.toBuffer('image/png');
        await fs.writeFile(plaquinhaPath, buffer);

        // 3. Montar HTML a partir do Template
        let template = await fs.readFile(path.join(__dirname, 'templates', 'template.html'), 'utf-8');

        const socialButtons = [];
        if (cleanPhone) socialButtons.push(`<a href="${waLink}" class="btn btn-wa" target="_blank">💬 WhatsApp</a>`);
        if (data.instagram) socialButtons.push(`<a href="${data.instagram}" class="btn btn-ig" target="_blank">📸 Instagram</a>`);
        if (data.facebook) socialButtons.push(`<a href="${data.facebook}" class="btn btn-fb" target="_blank">📘 Facebook</a>`);
        if (mapsLink) socialButtons.push(`<a href="${mapsLink}" class="btn btn-maps" target="_blank">📍 Como Chegar</a>`);

        const replacements = {
            '{{NOME_EMPRESA}}': data.nome_empresa || '',
            '{{SEGMENTO}}': data.segmento || '',
            '{{FRASE_SEO}}': data.frase_seo || '',
            '{{LOGO}}': `./${logoFileName}`,
            '{{GOOGLE_REVIEW}}': data.google_review || '#',
            '{{BOTONES_SOCIAIS}}': socialButtons.join('\n'),
            '{{ENDERECO_COMPLETO}}': `${data.endereco || ''}, ${data.cidade || ''} - ${data.estado || ''}`,
            '{{COR_PRINCIPAL}}': data.cor_principal || '#10b981'
        };

        Object.keys(replacements).forEach(key => {
            const regex = new RegExp(key, 'g');
            template = template.replace(regex, replacements[key]);
        });

        await fs.writeFile(path.join(clienteDir, 'index.html'), template);

        // Atualizar Banco JSON
        const clientes = JSON.parse(await fs.readFile(DB_FILE, 'utf-8'));
        const newClient = {
            id: Date.now(),
            slug,
            ...data,
            url: `/clientes/${slug}/`,
            createdAt: new Date().toISOString()
        };
        clientes.push(newClient);
        await fs.writeFile(DB_FILE, JSON.stringify(clientes, null, 2));

        res.json({
            success: true,
            slug,
            url: `/clientes/${slug}/`,
            htmlDownload: `/clientes/${slug}/index.html`,
            qrDownload: `/clientes/${slug}/qr-code.png`,
            plaquinhaDownload: `/clientes/${slug}/plaquinha.png`
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao gerar arquivos do cliente.' });
    }
});

// API Lista de Clientes
app.get('/api/clientes', (req, res) => {
    try {
        const clientes = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        res.json(clientes);
    } catch (err) {
        res.json([]);
    }
});

app.listen(PORT, () => console.log(`🚀 ImpulsoWeb10 rodando na porta ${PORT}`));
