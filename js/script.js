document.addEventListener("DOMContentLoaded", () => {
    // --- Fond animé : vagues 3D d'étoiles ---
    (function initStarWaves() {
        const THREE = window.THREE;
        if (!THREE) return; // Three.js non chargé

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.domElement.className = "bg-canvas";
        renderer.domElement.style.pointerEvents = "none";
        document.body.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
        camera.position.z = 140;

        const cols = 180;
        const rows = 70;
        const count = cols * rows;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const baseX = new Float32Array(count);
        const baseY = new Float32Array(count);

        const width = 260;
        const height = 140;
        let p = 0;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const x = (j / (cols - 1) - 0.5) * width;
                const y = (i / (rows - 1) - 0.5) * height;
                positions[p * 3] = x;
                positions[p * 3 + 1] = y;
                positions[p * 3 + 2] = (Math.random() - 0.5) * 2;
                baseX[p] = x;
                baseY[p] = y;
                p++;
            }
        }

        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("baseX", new THREE.BufferAttribute(baseX, 1));
        geometry.setAttribute("baseY", new THREE.BufferAttribute(baseY, 1));

        // ajouter des couleurs par sommet (teintes douces autour du bleu/cyan)
        const colors = new Float32Array(count * 3);
        function hslToRgb(h, s, l) {
            let r, g, b;
            if (s === 0) r = g = b = l;
            else {
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1 / 6) return p + (q - p) * 6 * t;
                    if (t < 1 / 2) return q;
                    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                    return p;
                };
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                r = hue2rgb(p, q, h + 1 / 3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1 / 3);
            }
            return [r, g, b];
        }

        for (let i = 0; i < count; i++) {
            const bx = baseX[i];
            const by = baseY[i];
            // hue dépend de x et y pour varier les couleurs
            const h = 0.55 + Math.sin(bx * 0.012 + by * 0.015) * 0.06;
            const s = 0.65 + Math.random() * 0.15;
            const l = 0.6 + Math.random() * 0.12;
            const [r, g, b] = hslToRgb(((h % 1) + 1) % 1, s, l);
            colors[i * 3] = r;
            colors[i * 3 + 1] = g;
            colors[i * 3 + 2] = b;
        }
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 1.4,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.95,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        const points = new THREE.Points(geometry, material);
        scene.add(points);

        // seconde couche: étoiles plus grosses et colorées (sparse)
        const sparseCount = Math.max(200, Math.floor(count * 0.03));
        const geom2 = new THREE.BufferGeometry();
        const pos2 = new Float32Array(sparseCount * 3);
        const col2 = new Float32Array(sparseCount * 3);
        for (let i = 0; i < sparseCount; i++) {
            const j = Math.floor(Math.random() * count);
            pos2[i * 3] = positions[j * 3] + (Math.random() - 0.5) * 6;
            pos2[i * 3 + 1] = positions[j * 3 + 1] + (Math.random() - 0.5) * 6;
            pos2[i * 3 + 2] = positions[j * 3 + 2] + (Math.random() - 0.5) * 6;
            // couleurs plus chaudes/variées
            const hue = 0.52 + (Math.random() - 0.5) * 0.2;
            const sat = 0.7 + Math.random() * 0.25;
            const lig = 0.6 + Math.random() * 0.25;
            const [rr, gg, bb] = hslToRgb(((hue % 1) + 1) % 1, sat, lig);
            col2[i * 3] = rr;
            col2[i * 3 + 1] = gg;
            col2[i * 3 + 2] = bb;
        }
        geom2.setAttribute("position", new THREE.BufferAttribute(pos2, 3));
        geom2.setAttribute("color", new THREE.BufferAttribute(col2, 3));
        const mat2 = new THREE.PointsMaterial({
            size: 4.0,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        const points2 = new THREE.Points(geom2, mat2);
        scene.add(points2);

        // appliquer un léger sur-échantillonnage (scale) pour faire déborder l'animation
        function updateOverflowScale() {
            const base = Math.max(window.innerWidth / 1200, window.innerHeight / 800, 1);
            const scale = Math.min(1.7, 1.15 * base); // clamp
            points.scale.set(scale, scale, scale);
            points2.scale.set(scale * 1.05, scale * 1.05, scale * 1.05);
        }
        updateOverflowScale();

        const clock = new THREE.Clock();

        function animate() {
            const t = clock.getElapsedTime();
            const pos = geometry.attributes.position.array;
            // amplitudes et vitesses réduites pour un rendu plus doux
            for (let i = 0; i < count; i++) {
                const bx = baseX[i];
                const by = baseY[i];
                const idx = i * 3;
                pos[idx + 2] = Math.sin(bx * 0.028 + by * 0.042 + t * 0.6) * 3.5 + Math.sin(t * 0.15 + i * 0.001) * 0.12;
                pos[idx + 1] = by + Math.sin(bx * 0.012 + t * 0.4) * 0.6;
            }
            geometry.attributes.position.needsUpdate = true;

            // rotations très légères
            points.rotation.x = Math.sin(t * 0.008) * 0.02;
            points.rotation.y = Math.sin(t * 0.005) * 0.03;

            // scintillement très subtil pour la couche dense
            material.opacity = 0.88 + Math.sin(t * 0.6) * 0.02;

            // scintillement adouci pour la couche sparse
            if (typeof mat2 !== "undefined") {
                mat2.opacity = 0.75 + Math.abs(Math.sin(t * 0.45)) * 0.18;
                mat2.size = 3.6 + Math.sin(t * 0.7) * 0.5; // variation plus douce
                mat2.needsUpdate = true;
            }

            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        }
        animate();

        function onResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            updateOverflowScale();
        }
        window.addEventListener("resize", onResize);
    })();

    const toggle = document.querySelector(".nav-toggle");
    const nav = document.getElementById("primary-navigation");
    const list = nav ? nav.querySelector(".nav-list") : null;
    if (!toggle || !list) return;

    // état initial selon la largeur
    function setInitialState() {
        if (window.innerWidth <= 700) {
            list.classList.remove("open");
            list.setAttribute("aria-hidden", "true");
            toggle.setAttribute("aria-expanded", "false");
        } else {
            list.removeAttribute("aria-hidden");
            toggle.setAttribute("aria-expanded", "false");
        }
    }
    setInitialState();

    function openNav() {
        list.classList.add("open");
        list.setAttribute("aria-hidden", "false");
        toggle.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-pressed", "true");
    }
    function closeNav() {
        list.classList.remove("open");
        list.setAttribute("aria-hidden", "true");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-pressed", "false");
    }

    toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        if (list.classList.contains("open")) closeNav();
        else openNav();
    });

    // fermer avec Échap
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeNav();
    });

    // fermer si clic en dehors
    document.addEventListener("click", (e) => {
        if (!nav.contains(e.target) && !toggle.contains(e.target)) closeNav();
    });

    // adapter au redimensionnement
    window.addEventListener("resize", () => {
        if (window.innerWidth > 700) {
            list.classList.remove("open");
            list.removeAttribute("aria-hidden");
            toggle.setAttribute("aria-expanded", "false");
        } else {
            list.setAttribute("aria-hidden", "true");
            toggle.setAttribute("aria-expanded", "false");
        }
    });

    // calcule et expose la hauteur du header pour éviter le recouvrement
    const headerEl = document.querySelector("header");
    if (headerEl) {
        const updateHeaderHeight = () => {
            const h = headerEl.offsetHeight || 0;
            document.documentElement.style.setProperty("--header-height", `${h}px`);
        };
        updateHeaderHeight();
        let rszTimeout;
        window.addEventListener("resize", () => {
            clearTimeout(rszTimeout);
            rszTimeout = setTimeout(updateHeaderHeight, 100);
        });
    }

    // --- Scroll‑spy : applique .is-active sur les liens du menu selon la section visible ---
    (function initScrollSpy() {
        const navLinks = document.querySelectorAll(".nav-list a");
        if (!navLinks.length) return;

        const linkToSection = new Map();
        navLinks.forEach((link) => {
            const href = link.getAttribute("href");
            if (!href) return;
            if (href === "#" || href === "") {
                const hero = document.querySelector(".hero");
                if (hero) linkToSection.set(link, hero);
            } else if (href.startsWith("#")) {
                const sec = document.querySelector(href);
                if (sec) linkToSection.set(link, sec);
            }

            // fermer le menu mobile au clic et laisser l'observer gérer l'état actif
            link.addEventListener("click", () => {
                if (list && list.classList.contains("open")) closeNav();
            });
        });

        let headerHeight = headerEl ? headerEl.offsetHeight || 72 : 72;

        // mapping section -> link for activation
        const sections = Array.from(new Set(Array.from(linkToSection.values())));
        const linksBySection = new Map();
        for (const [link, sec] of linkToSection.entries()) linksBySection.set(sec, link);

        function clearActive() {
            navLinks.forEach((l) => {
                l.classList.remove("is-active");
                l.removeAttribute("aria-current");
            });
        }
        function setActive(link) {
            clearActive();
            link.classList.add("is-active");
            link.setAttribute("aria-current", "page");
        }

        // met à jour l'état actif en fonction d'un point de référence sous l'en-tête
        function updateActiveByScroll() {
            const offsetPoint = headerHeight + 24; // 24px sous l'en-tête
            // trouver la section englobant ce point
            let found = null;
            for (const sec of sections) {
                const rect = sec.getBoundingClientRect();
                if (rect.top <= offsetPoint && rect.bottom > offsetPoint) {
                    found = sec;
                    break;
                }
            }

            if (found) {
                const link = linksBySection.get(found);
                if (link) {
                    setActive(link);
                    return;
                }
            }

            // cas particulier: tout en haut de la page -> activer Accueil
            if (window.scrollY <= headerHeight + 20) {
                for (const [link, sec] of linkToSection.entries()) {
                    if (!link.getAttribute("href") || link.getAttribute("href") === "#") {
                        setActive(link);
                        return;
                    }
                }
            }

            // fallback: choisir la section la plus proche du point de référence
            let best = null;
            let bestDist = Infinity;
            for (const sec of sections) {
                const rect = sec.getBoundingClientRect();
                const dist = Math.abs(rect.top - offsetPoint);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = sec;
                }
            }
            if (best && bestDist < window.innerHeight) {
                const link = linksBySection.get(best);
                if (link) {
                    setActive(link);
                    return;
                }
            }

            clearActive();
        }

        // debounced via rAF for performance
        let ticking = false;
        window.addEventListener(
            "scroll",
            () => {
                if (!ticking) {
                    window.requestAnimationFrame(() => {
                        updateActiveByScroll();
                        ticking = false;
                    });
                    ticking = true;
                }
            },
            { passive: true }
        );

        // mettre à jour à l'initialisation et au redimensionnement
        updateActiveByScroll();
        window.addEventListener(
            "resize",
            () => {
                headerHeight = headerEl ? headerEl.offsetHeight || 72 : 72;
                updateActiveByScroll();
            },
            { passive: true }
        );
    })();

    // --- Effet 3D léger au survol des skill cards ---
    (function addSkillCardTilt() {
        const cards = document.querySelectorAll(".skill-card");
        if (!cards.length) return;
        const maxAngle = 6; // degrés
        const scaleOnHover = 1.02;

        function handleMove(e, card) {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const rx = ((y - cy) / cy) * maxAngle; // rotateX
            const ry = ((x - cx) / cx) * -maxAngle; // rotateY
            card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scaleOnHover})`;
        }

        function reset(card) {
            card.style.transform = "";
            card.classList.remove("is-hover");
        }

        cards.forEach((card) => {
            card.addEventListener("mouseenter", () => {
                card.classList.add("is-hover");
            });
            card.addEventListener("mousemove", (e) => handleMove(e, card));
            card.addEventListener("mouseleave", () => reset(card));
            // touch fallback: slight scale on touch
            card.addEventListener("touchstart", () => card.classList.add("is-hover"));
            card.addEventListener("touchend", () => reset(card));
        });
    })();
});

const scrollContainer = document.querySelector(".scroll-container");
let isDown = false;
let startX;
let scrollLeft;

scrollContainer.addEventListener("mousedown", (e) => {
    isDown = true;
    startX = e.pageX - scrollContainer.offsetLeft;
    scrollLeft = scrollContainer.scrollLeft;
    scrollContainer.style.cursor = "grabbing";
});

scrollContainer.addEventListener("mouseleave", () => {
    isDown = false;
    scrollContainer.style.cursor = "grab";
});

scrollContainer.addEventListener("mouseup", () => {
    isDown = false;
    scrollContainer.style.cursor = "grab";
});

scrollContainer.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - scrollContainer.offsetLeft;
    const walk = (x - startX) * 2; // Adjust scroll speed
    scrollContainer.scrollLeft = scrollLeft - walk;
});
