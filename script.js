window.addEventListener('DOMContentLoaded', () => {
    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    const german = {
        skipLink: 'Zum Inhalt springen',
        mainNavLabel: 'Hauptnavigation',
        languageLabel: 'Sprachauswahl',
        navProjects: 'Projekte',
        navExperience: 'Erfahrung',
        navEducation: 'Bildungsweg',
        navContact: 'Kontakt',
        eyebrow: 'IT System Engineer · Celle, Deutschland',
        heroAccent: 'KI & Automatisierung',
        heroDescription: 'Ich entwickle praxisnahe Systeme an der Schnittstelle von Softwareentwicklung, Prozessautomatisierung und angewandter KI – von datenschutzorientierten Support-Werkzeugen bis zu Deep-Learning-Forschung auf komplexen Daten.',
        exploreWork: 'Projekte ansehen',
        getInTouch: 'Kontakt aufnehmen',
        highlightsLabel: 'Karriere-Highlights',
        signalGrade: 'MSc-Abschlussnote',
        signalProjects: 'Ausgewählte Projekte',
        signalEnglish: 'Englischkenntnisse',
        signalSystems: 'System Engineering',
        projectsLabel: 'Ausgewählte Arbeiten',
        projectsTitle: 'Für den Praxiseinsatz entwickelt.',
        projectsIntro: 'Eine Auswahl aus Produktentwicklung und Forschung – von verschlüsselten Workflows und Hardwarekonfiguration bis zu Machine Learning auf stark unausgewogenen Daten.',
        ticketAlt: 'Ticket-Forge-Arbeitsbereich mit drei Demo-Einträgen und einem geöffneten VPN-Supportticket',
        ticketDate: 'Aug. 2026—heute',
        ticketSummary: 'Eine browserbasierte Arbeitsumgebung für IT-Tickets mit Statusabläufen, Suche, Kontakten, Erinnerungen und integrierter Zeiterfassung.',
        ticketResult: '<strong>Datenschutz by Design:</strong> Lokaler AES-256-Datenspeicher sowie verschlüsselter Backup-Import und -Export halten sämtliche Ticketdaten auf dem Endgerät.',
        openLive: 'Zum Projekt',
        vialAlt: 'Vial-German-Konfigurator mit verbundener Corne-v4.1-Tastatur und deutscher QWERTZ-Belegung',
        vialDate: 'Juli 2026—heute',
        vialSummary: 'Ein angepasster Web-Konfigurator für Vial-kompatible Tastaturen mit verbessertem QWERTZ-Support und einem optimierten Makro-Workflow.',
        vialResult: '<strong>Gerätebasiert:</strong> WebHID und WebAssembly lesen Firmwaredefinition, Layout, Layer und unterstützte Funktionen direkt von der Tastatur aus.',
        amlAlt: 'Dashboard zur Überwachung von Finanztransaktionen mit hervorgehobenen verdächtigen Zahlungsströmen',
        amlDate: 'Okt. 2024—Aug. 2025',
        research: 'Forschung',
        amlTitle: 'Deep Learning zur Geldwäscheprävention',
        amlSummary: 'Vergleich eines bidirektionalen GRU Sequential Profilers mit einem Dynamic Temporal GCN auf einem extrem unausgewogenen AML-Datensatz von 1.941:1.',
        amlResult: '<strong>7× höhere AUPRC:</strong> Das sequentielle Modell erreichte 0,1622 gegenüber 0,0235 – mit 20,9 % Recall bei 47,1 % Präzision.',
        viewResearch: 'Forschung auf GitHub ansehen',
        experienceLabel: 'Erfahrung',
        experienceTitle: 'Engineering mit Prozessverständnis.',
        experienceIntro: 'Ich verbinde praktische Entwicklung mit Prozessanalyse, technischer Beratung und bereichsübergreifender Problemlösung.',
        kdoDate: 'Juni 2026—heute',
        kdoBullet1: 'Mitarbeit an der Prozessautomatisierung und KI-gestützten Digitalisierung im kommunalen Umfeld, einschließlich Workflows mit Camunda und n8n.',
        kdoBullet2: 'Analyse und Optimierung von Geschäfts- und Supportprozessen sowie Übersetzung der Ergebnisse in technische Lösungskonzepte und Automatisierungsansätze.',
        kdoBullet3: 'Technische Beratung von Anwendern und Fachbereichen bei Einführung, Nutzung und Fehleranalyse digitaler Anwendungen.',
        kdoBullet4: 'Analyse technischer Störungen in kommunalen Fachanwendungen und Koordination von Lösungsansätzen mit Fachbereichen, internen IT-Teams und externen Softwaredienstleistern.',
        researchDate: 'Sep. 2023—Sep. 2024',
        researchRole: 'Forschungsassistent',
        researchBullet1: 'Konzeption und Implementierung eines modularen NLP-Prototyps zur Identifikation von Entitäten und semantischen Relationen im universitären Forschungsumfeld.',
        researchBullet2: 'Entwicklung einer Datenverarbeitungspipeline und Modellierung der extrahierten Informationen als gerichtete Graphstrukturen für die spätere Graphdatenbank-Integration.',
        researchBullet3: 'Test und Evaluierung des Prototyps anhand annotierter Beispieldokumente sowie Analyse von Fehlerfällen und Ergebnisqualität.',
        educationLabel: 'Bildungsweg',
        educationTitle: 'Software-Fundament. KI-Tiefe.',
        educationIntro: 'Ein solides Engineering-Fundament, vertieft durch ein Masterstudium in Machine Learning, Deep Learning, Computer Vision und verantwortungsvoller KI.',
        mscDate: 'Sep. 2024—Okt. 2025',
        mscTitle: 'MSc Artificial Intelligence',
        finalGrade: 'Abschlussnote',
        mscDescription: 'Machine Learning, Computer Vision, Applied Statistics und Deep Learning mit vertiefter Auseinandersetzung mit DSGVO, EU AI Act sowie verantwortungsvoller Entwicklung und Evaluation von KI-Systemen.',
        bengDate: 'Sep. 2021—Sep. 2024',
        bengTitle: 'BEng Software Engineering',
        bengDescription: 'Zu den Kernmodulen gehörten Software Development, Database Systems sowie Web Design and Development.',
        skillsLabel: 'Fähigkeiten',
        skillsTitle: 'Ein praxisnahes technisches Profil.',
        skillsIntro: 'Von Backendsystemen und Machine-Learning-Pipelines bis zu Workflowautomatisierung, Deployment und technischem Anwendersupport.',
        skillSoftwareTitle: 'Softwareentwicklung',
        skillSoftwareBody: 'Python, C#, Java, JavaScript, SQL, FastAPI, REST APIs, Backend-Entwicklung',
        skillDataTitle: 'Daten & KI',
        skillDataBody: 'PostgreSQL, SQLite, PyTorch, scikit-learn, pandas, NumPy, NLP, Computer Vision, Deep Learning, ETL-Pipelines',
        skillAutomationTitle: 'Automatisierung & DevOps',
        skillAutomationBody: 'Camunda, n8n, Prozess- und Workflowautomatisierung, Docker, CI/CD, Git, Linux, Testing',
        skillProcessesTitle: 'IT & Prozesse',
        skillProcessesBody: 'Anforderungs- und Prozessanalyse, Geschäftsprozessoptimierung, technische Lösungskonzepte, Windows, Citrix, Active Directory, Netzwerkgrundlagen',
        skillLanguagesTitle: 'Sprachen',
        skillLanguagesBody: 'Deutsch — Muttersprache · Englisch — C2 · Russisch — A2',
        skillStyleTitle: 'Arbeitsweise',
        skillStyleBody: 'Strukturierte Problemlösung, technische Beratung, Forschungsevaluation und klare bereichsübergreifende Kommunikation',
        contactLabel: 'Kontakt',
        contactTitle: 'Offen für neue Projekte.',
        contactIntro: 'Ich lebe in Celle und interessiere mich für durchdachte Software, Automatisierung und angewandte KI.',
        footerTag: 'IT System Engineering · KI · Automatisierung'
    };

    const textNodes = [...document.querySelectorAll('[data-i18n]')];
    const htmlNodes = [...document.querySelectorAll('[data-i18n-html]')];
    const altNodes = [...document.querySelectorAll('[data-i18n-alt]')];
    const ariaNodes = [...document.querySelectorAll('[data-i18n-aria-label]')];
    const originalText = new Map(textNodes.map((node) => [node, node.textContent]));
    const originalHtml = new Map(htmlNodes.map((node) => [node, node.innerHTML]));
    const originalAlt = new Map(altNodes.map((node) => [node, node.getAttribute('alt')]));
    const originalAria = new Map(ariaNodes.map((node) => [node, node.getAttribute('aria-label')]));
    const metaDescription = document.querySelector('meta[name="description"]');
    const englishDescription = metaDescription?.content;

    const setLanguage = (language) => {
        const isGerman = language === 'de';
        document.documentElement.lang = language;
        document.title = isGerman
            ? 'Anatol Satler | IT System Engineer & KI'
            : 'Anatol Satler | IT Systems Engineer & AI';

        if (metaDescription) {
            metaDescription.content = isGerman
                ? 'Portfolio von Anatol Satler, IT System Engineer und KI-orientierter Softwareentwickler mit Fokus auf Automatisierung, angewandtes Machine Learning und datenschutzorientierte Webtools.'
                : englishDescription;
        }

        textNodes.forEach((node) => {
            const key = node.dataset.i18n;
            node.textContent = isGerman ? german[key] : originalText.get(node);
        });
        htmlNodes.forEach((node) => {
            const key = node.dataset.i18nHtml;
            node.innerHTML = isGerman ? german[key] : originalHtml.get(node);
        });
        altNodes.forEach((node) => {
            const key = node.dataset.i18nAlt;
            node.setAttribute('alt', isGerman ? german[key] : originalAlt.get(node));
        });
        ariaNodes.forEach((node) => {
            const key = node.dataset.i18nAriaLabel;
            node.setAttribute('aria-label', isGerman ? german[key] : originalAria.get(node));
        });

        document.querySelectorAll('.language-option').forEach((button) => {
            const active = button.dataset.language === language;
            button.classList.toggle('is-active', active);
            button.setAttribute('aria-pressed', String(active));
        });

        try { localStorage.setItem('portfolio-language', language); } catch (_) {}
    };

    document.querySelectorAll('.language-option').forEach((button) => {
        button.addEventListener('click', () => setLanguage(button.dataset.language));
    });

    let savedLanguage = 'en';
    try {
        const saved = localStorage.getItem('portfolio-language');
        if (saved === 'de' || saved === 'en') savedLanguage = saved;
    } catch (_) {}
    setLanguage(savedLanguage);

    if (!window.THREE || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07111f, 0.018);

    const camera = new THREE.PerspectiveCamera(58, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 4.1, 8.8);
    camera.lookAt(1.8, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setClearColor(0x07111f, 1);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x6b8fb7, 0.42));

    const system = new THREE.Group();
    system.position.set(2.7, -0.15, -1.2);
    system.rotation.z = -0.08;
    scene.add(system);

    const sun = new THREE.Mesh(
        new THREE.SphereGeometry(0.62, 48, 48),
        new THREE.MeshBasicMaterial({ color: 0xf6b75f })
    );
    system.add(sun);

    const sunLight = new THREE.PointLight(0xffc477, 2.4, 14);
    system.add(sunLight);

    [0.82, 1.02].forEach((radius, index) => {
        const halo = new THREE.Mesh(
            new THREE.SphereGeometry(radius, 40, 40),
            new THREE.MeshBasicMaterial({
                color: index === 0 ? 0xffb24c : 0xffd193,
                transparent: true,
                opacity: index === 0 ? 0.11 : 0.035,
                side: THREE.BackSide
            })
        );
        system.add(halo);
    });

    const planets = [
        { radius: 1.25, size: 0.10, color: 0xa8bbc9, speed: 0.24, phase: 0.3 },
        { radius: 1.72, size: 0.16, color: 0xe59a5e, speed: 0.16, phase: 2.1 },
        { radius: 2.28, size: 0.18, color: 0x3198cc, speed: 0.11, phase: 4.2, moon: true },
        { radius: 2.92, size: 0.13, color: 0xb85f48, speed: 0.082, phase: 1.2 },
        { radius: 3.72, size: 0.31, color: 0xd2a76c, speed: 0.052, phase: 3.25, ring: true }
    ];

    const planetBodies = [];
    planets.forEach((config) => {
        const orbitPoints = [];
        for (let index = 0; index < 128; index++) {
            const angle = index / 128 * Math.PI * 2;
            orbitPoints.push(new THREE.Vector3(Math.cos(angle) * config.radius, 0, Math.sin(angle) * config.radius));
        }
        const orbit = new THREE.LineLoop(
            new THREE.BufferGeometry().setFromPoints(orbitPoints),
            new THREE.LineBasicMaterial({ color: 0x6ba7ce, transparent: true, opacity: 0.16 })
        );
        system.add(orbit);

        const carrier = new THREE.Group();
        carrier.rotation.y = config.phase;
        system.add(carrier);

        const planet = new THREE.Mesh(
            new THREE.SphereGeometry(config.size, 30, 30),
            new THREE.MeshStandardMaterial({
                color: config.color,
                roughness: 0.76,
                metalness: 0.08,
                emissive: config.color,
                emissiveIntensity: 0.035
            })
        );
        planet.position.x = config.radius;
        carrier.add(planet);

        if (config.ring) {
            const ring = new THREE.Mesh(
                new THREE.RingGeometry(config.size * 1.4, config.size * 2.05, 48),
                new THREE.MeshBasicMaterial({ color: 0xd7bd93, transparent: true, opacity: 0.58, side: THREE.DoubleSide })
            );
            ring.rotation.x = Math.PI / 2.35;
            planet.add(ring);
        }

        if (config.moon) {
            const moonPivot = new THREE.Group();
            planet.add(moonPivot);
            const moon = new THREE.Mesh(
                new THREE.SphereGeometry(0.035, 18, 18),
                new THREE.MeshStandardMaterial({ color: 0xcbd2d8, roughness: 1 })
            );
            moon.position.x = 0.32;
            moonPivot.add(moon);
            planet.userData.moonPivot = moonPivot;
        }

        planetBodies.push({ carrier, planet, speed: config.speed, phase: config.phase });
    });

    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1400;
    const starPositions = new Float32Array(starCount * 3);
    for (let index = 0; index < starCount; index++) {
        starPositions[index * 3] = (Math.random() - 0.5) * 34;
        starPositions[index * 3 + 1] = (Math.random() - 0.5) * 22;
        starPositions[index * 3 + 2] = -3 - Math.random() * 24;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
        starGeometry,
        new THREE.PointsMaterial({ size: 0.028, color: 0xddeeff, transparent: true, opacity: 0.68 })
    );
    scene.add(stars);

    let pointerX = 0;
    let pointerY = 0;
    document.addEventListener('pointermove', (event) => {
        pointerX = (event.clientX / window.innerWidth - 0.5) * 0.4;
        pointerY = (event.clientY / window.innerHeight - 0.5) * 0.24;
    }, { passive: true });

    const resize = () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', resize, { passive: true });

    const clock = new THREE.Clock();
    const animate = () => {
        const elapsed = clock.getElapsedTime();
        sun.rotation.y = elapsed * 0.08;
        planetBodies.forEach(({ carrier, planet, speed, phase }, index) => {
            carrier.rotation.y = phase + elapsed * speed;
            planet.rotation.y = elapsed * (0.22 + index * 0.035);
            if (planet.userData.moonPivot) planet.userData.moonPivot.rotation.y = elapsed * 0.75;
        });
        stars.rotation.y = elapsed * 0.003;
        camera.position.x += (pointerX - camera.position.x) * 0.018;
        camera.position.y += (4.1 - pointerY - camera.position.y) * 0.018;
        camera.lookAt(1.8, 0, 0);
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    };
    animate();
});
