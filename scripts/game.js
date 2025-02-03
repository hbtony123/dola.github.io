document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const gameInfo = document.getElementById('gameInfo');
    const startButton = document.getElementById('startButton');

    let fruits = [];
    let particles = [];
    let score = 0;
    let timeElapsed = 0;

    const fruitTypes = [
        { shape: 'circle', color: 'red', size: 20 },
        { shape: 'circle', color: 'green', size: 25 },
        { shape: 'circle', color: 'yellow', size: 15 },
        { shape: 'square', color: 'orange', size: 20 },
        { shape: 'square', color: 'purple', size: 25 }
    ];

    // 添加音效
    const breakSound = new Audio('./scripts/pusound.ogg');
    // 添加背景音乐
    const backgroundMusic = new Audio('./scripts/Tribute.m4a');
    backgroundMusic.loop = true; // 循环播放背景音乐
    backgroundMusic.volume = 0.05; // 将音量设置为0.1

    function drawFruit(fruit) {
        ctx.fillStyle = fruit.color;
        if (fruit.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(fruit.x, fruit.y, fruit.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.closePath();
        } else if (fruit.shape === 'square') {
            ctx.fillRect(fruit.x - fruit.size / 2, fruit.y - fruit.size / 2, fruit.size, fruit.size);
        }
    }

    function drawParticle(particle) {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();
        ctx.closePath();
    }

    function drawScore() {
        ctx.font = '24px Arial';
        ctx.fillStyle = 'black';
        ctx.fillText('Time: ' + Math.floor(timeElapsed / 60) + 's', 10, 30); // 计时器在左上角
        ctx.fillText('Score: ' + score, canvas.width - 160, 30); // 分数在右上角，增加右边距
    }

    function updateGame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update and draw fruits
        fruits.forEach((fruit, index) => {
            drawFruit(fruit);
            fruit.y += 2; // Move fruit down
            if (fruit.y > canvas.height) {
                createParticles(fruit.x, canvas.height, fruit.color);
                fruits.splice(index, 1);
            }
        });

        // Update and draw particles
        particles.forEach((particle, index) => {
            drawParticle(particle);
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.1;
            particle.life -= 1;
            if (particle.life <= 0) {
                particles.splice(index, 1);
            }
        });

        timeElapsed++;

        drawScore();
        requestAnimationFrame(updateGame);
    }

    function spawnFruit() {
        const x = Math.random() * (canvas.width - 40) + 20;
        const fruitType = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
        fruits.push({ x: x, y: 0, ...fruitType });
    }

    function createParticles(x, y, color) {
        for (let i = 0; i < 20; i++) {
            particles.push({
                x: x,
                y: y,
                size: Math.random() * 10 + 5,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 30,
                color: color
            });
        }
    }

    function checkCollision(x, y) {
        fruits.forEach((fruit, index) => {
            const dx = fruit.x - x;
            const dy = fruit.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < fruit.size) {
                fruits.splice(index, 1);
                createParticles(fruit.x, fruit.y, fruit.color);
                score += 10;
                breakSound.play(); // 播放破碎音效
                console.log('Score:', score);
            }
        });
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resizeCanvas);

    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        checkCollision(x, y);
    });

    startButton.addEventListener('click', () => {
        gameInfo.style.display = 'none';
        resizeCanvas();
        setInterval(spawnFruit, 1000);
        updateGame();
        // 确保在用户交互后播放背景音乐
        backgroundMusic.play();
    });
}); 