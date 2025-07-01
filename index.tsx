
import React, { useState, useEffect, useRef, useCallback, createContext, useContext, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

// --- Game Configuration & Constants ---
const TILE_SIZE = 48;
const DAY_LENGTH_SECONDS = 180; // 3 minutes per day
const WORLD_WIDTH_TILES = 28;
const WORLD_HEIGHT_TILES = 18;

const SEASONS = {
    summer: { name: 'ฤดูร้อน', icon: '☀️', color: '#374151' },
    autumn: { name: 'ฤดูใบไม้ร่วง', icon: '🍂', color: '#4b5563' },
    winter: { name: 'ฤดูหนาว', icon: '❄️', color: '#1f2937' },
    spring: { name: 'ฤดูใบไม้ผลิ', icon: '🌸', color: '#374151' },
};

const CHAR_TYPES = {
    boy: { name: 'เด็กหนุ่ม', sprite: '👦' },
    girl: { name: 'เด็กสาว', sprite: '👧' },
    adventurer: { name: 'นักผจญภัย', sprite: '🤠' },
    mystic: { name: 'ผู้ลึกลับ', sprite: '🧙' }
};

const SHOP_ITEMS = [
    { id: 'tree_planter_pack', name: 'แพ็คปลูกต้นไม้ x5', icon: '🌳', price: 15, action: (ctx) => ctx.addItemToInventory('tree_planter', 5) },
    { id: 'fertilizer', name: 'ปุ๋ยเร่งโต', icon: '💩', price: 40, action: (ctx) => ctx.addItemToInventory('fertilizer', 1) },
    { id: 'carrot_seeds', name: 'เมล็ดแครอท x5', icon: '🥕', price: 20, action: (ctx) => ctx.addItemToInventory('carrot_seeds', 5) },
    { id: 'refill_water', name: 'เติมน้ำเต็มถัง', icon: '💧', price: 10, action: (ctx) => ctx.setPlayer(p => ({ ...p, water: p.maxWater })) },
    { id: 'flower_seeds', name: 'เมล็ดดอกไม้ x3', icon: '🌸', price: 50, action: (ctx) => ctx.addItemToInventory('flower_seeds', 3) },
    { id: 'fruit_tree_seeds', name: 'เมล็ดไม้ผล x2', icon: '🍎', price: 75, action: (ctx) => ctx.addItemToInventory('fruit_tree_seeds', 2) },
    { id: 'soil_reviver', name: 'น้ำยาฟื้นดิน', icon: '🧪', price: 100, action: (ctx) => ctx.addItemToInventory('soil_reviver', 1) },
];

const PERMANENT_UPGRADES = [
    { id: 'golden_watering_can', name: 'บัวรดน้ำทองคำ', icon: '🌟', price: 500, description: 'รดน้ำไม่จำกัด! ไม่ต้องเติมอีกต่อไป' },
    { id: 'golden_axe', name: 'ขวานทองคำ', icon: '🌟', price: 600, description: 'ตัดต้นไม้แล้วได้โกลด์เพิ่ม 50%' },
    { id: 'permanent_xp_boost', name: 'พรแห่งพงไพร', icon: '⭐', price: 1000, description: 'ได้รับ XP ทั้งหมดเพิ่มขึ้น 20% ถาวร' },
];


const REDEMPTION_ITEMS = {
    vouchers: [
        { id: 'truemoney_50', name: 'บัตรเงินสด TrueMoney 50 บาท', icon: 'T', price: 5000, brandClass: 'brand-truemoney' },
        { id: 'paypal_50', name: 'เครดิต PayPal $1.5', icon: 'P', price: 5500, brandClass: 'brand-paypal' },
    ],
    discounts: [
        { id: 'mrt_pass', name: 'ส่วนลด MRT 10 เที่ยว', icon: 'M', price: 7500, brandClass: 'brand-mrt' },
    ],
    upgrades: PERMANENT_UPGRADES
};


const SKILL_TREE = {
    'ศาสตร์แห่งพฤกษา': [
        { id: 'fast_growth', name: 'พรสวรรค์เติบโต', desc: 'ต้นไม้โตไวขึ้น 10% ต่อระดับ', maxLevel: 5 },
        { id: 'rich_harvest', name: 'พืชผลอุดมสมบูรณ์', desc: 'ได้ Gold จากต้นไม้มากขึ้น 10% ต่อระดับ', maxLevel: 3 },
    ],
    'วิถีแห่งสายน้ำ': [
        { id: 'water_capacity', name: 'กระเป๋าน้ำใหญ่ขึ้น', desc: 'ความจุน้ำเพิ่มขึ้น 25 หน่วยต่อระดับ', maxLevel: 4 },
        { id: 'efficient_watering', name: 'รดน้ำมีประสิทธิภาพ', desc: 'โอกาส 10% ที่การรดน้ำจะไม่เสียน้ำ/ระดับ', maxLevel: 5 },
    ],
    'จิตวิญญาณแห่งการค้า': [
        { id: 'better_prices', name: 'เสน่ห์นักต่อรอง', desc: 'ซื้อของในร้านค้าถูกลง 5% ต่อระดับ', maxLevel: 4 },
    ]
};

const WHEEL_SEGMENTS = [
    { type: 'gold', value: 50, label: '50', icon: '💰', color: '#fde047' },
    { type: 'item', value: 'fertilizer', quantity: 1, label: 'ปุ๋ย', icon: '💩', color: '#d9f99d' },
    { type: 'gold', value: 150, label: '150', icon: '💰', color: '#facc15' },
    { type: 'bomb', label: 'ระเบิด!', icon: '💣', color: '#450a0a' },
    { type: 'item', value: 'tree_planter', quantity: 5, label: 'ต้นไม้ x5', icon: '🌳', color: '#a7f3d0' },
    { type: 'gold', value: 75, label: '75', icon: '💰', color: '#fde047' },
    { type: 'item', value: 'soil_reviver', quantity: 1, label: 'น้ำยาฟื้นดิน', icon: '🧪', color: '#a5b4fc' },
    { type: 'gold', value: 250, label: '250', icon: '💰', color: '#eab308' },
];

const LEVELS = [
    {
        name: "ทุ่งหญ้าเขียวขจี",
        width_tiles: WORLD_WIDTH_TILES,
        height_tiles: WORLD_HEIGHT_TILES,
        pollution: 0.3,
        crawler_count: 5,
        wildman_count: 2,
        villager_count: 5,
        objective: { type: 'kill_boss', target: 1, current: 0, bossType: 'elder_crawler' }
    },
    {
        name: "ป่าเสียงกระซิบ",
        width_tiles: WORLD_WIDTH_TILES + 4,
        height_tiles: WORLD_HEIGHT_TILES + 4,
        pollution: 0.5,
        crawler_count: 8,
        wildman_count: 5,
        villager_count: 3,
        objective: { type: 'kill_boss', target: 1, current: 0, bossType: 'wildman_chieftain' }
    }
];


// --- React Context for Global State Management ---
const GameContext = createContext(null);

type GameProviderProps = {
    children?: React.ReactNode;
};

const GameProvider = ({ children }: GameProviderProps) => {
    const [player, setPlayer] = useState(null);
    const [world, setWorld] = useState({
        map: [], objects: [], npcs: [], particles: [], projectiles: [], weaponDrops: [],
        width: TILE_SIZE * WORLD_WIDTH_TILES, height: TILE_SIZE * WORLD_HEIGHT_TILES,
        pollution: 0.5, weather: 'sunny', screenShake: 0
    });
    const [time, setTime] = useState({ day: 1, season: 'summer', dayTimer: 0 });
    const [quests, setQuests] =useState([]);
    const [message, setMessage] = useState(null);
    const [activeDialogue, setActiveDialogue] = useState(null);
    const [isDailyRewardAvailable, setDailyRewardAvailable] = useState(false);
    const [deviceType, setDeviceType] = useState('desktop');
    const [isGameOver, setGameOver] = useState(false);
    const [isLoading, setLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState({progress: 0, text: ''});
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [tutorial, setTutorial] = useState({ step: 'inactive', isActive: false });
    const [level, setLevel] = useState(0);
    const [levelObjective, setLevelObjective] = useState(null);

    const playerActionRef = useRef<() => void>();


    const generateMap = useCallback((levelConfig, pollution) => {
        const {width_tiles, height_tiles} = levelConfig;
        const newMap = [];
        const newObjects = [];
        const biome = levelConfig.name.includes("ป่า") ? 'forest' : 'meadow';

        for (let y = 0; y < height_tiles; y++) {
            const row = [];
            for (let x = 0; x < width_tiles; x++) {
                const isBlight = Math.random() < pollution;
                let tileType = isBlight ? 'blight' : 'grass';
                if(biome === 'forest' && !isBlight) tileType = 'forest_floor';

                row.push({ type: tileType });

                if (!isBlight && Math.random() < 0.05) {
                    newObjects.push({
                        id: `rock_${x}_${y}`,
                        type: Math.random() < 0.5 ? 'rock' : 'flower_patch',
                        x: x * TILE_SIZE, y: y * TILE_SIZE,
                        width: TILE_SIZE, height: TILE_SIZE
                    });
                }
                 if (!isBlight && Math.random() < 0.015) { // Add ruins
                    newObjects.push({
                        id: `ruin_${x}_${y}`, type: 'ruin_wall',
                        x: x * TILE_SIZE, y: y * TILE_SIZE,
                        width: TILE_SIZE, height: TILE_SIZE
                    });
                }
            }
            newMap.push(row);
        }
        return {map: newMap, objects: newObjects};
    }, []);

    const generateNpcs = useCallback((levelConfig) => {
        const { width_tiles, height_tiles, crawler_count, wildman_count, villager_count, objective } = levelConfig;
        const worldWidth = width_tiles * TILE_SIZE;
        const worldHeight = height_tiles * TILE_SIZE;
        const npcs = [];
        const villagerNames = ['อารี', 'มีนา', 'สมชาย', 'บุญมา', 'แก้ว', 'พร', 'ทวี', 'นารา', 'เอก', 'ปิติ'];
        const villagerPortraits = ['👨‍🌾', '👩‍🌾', '👴', '👵', '👨‍🍳', '👩‍🎨', '👨‍🎤', '👩‍🎤', '👨‍🏫', '👩‍🏫'];

        // Core NPCs
        npcs.push({
            id: 'elder_bamboo', type: 'elder', name: 'ผู้อาวุโสแห่งพงไพร',
            x: worldWidth * 0.8, y: worldHeight * 0.2, width: TILE_SIZE, height: TILE_SIZE,
            health: 200, maxHealth: 200, portrait: '🌳',
            dialogue: ["พลังแห่งมลพิษกำลังกัดกินทุกสิ่ง จงใช้พลังแห่งธรรมชาติเพื่อฟื้นฟูมัน", "จงระวังตัว... ไม่ใช่ทุกชีวิตในป่านี้จะเป็นมิตร"]
        });
        npcs.push({
            id: 'gardener_lia', type: 'gardener', name: 'ลีอา',
            x: worldWidth * 0.2, y: worldHeight * 0.7, width: TILE_SIZE, height: TILE_SIZE,
            health: 100, maxHealth: 100, speed: 50, moveTimer: Math.random() * 8, targetX: null, targetY: null, portrait: '👩‍🌾',
            dialogue: ["ถ้าเธอมี 'น้ำยาฟื้นดิน' สักขวด ฉันยอมแลกกับเมล็ดแครอทวิเศษของฉันเลยนะ!"],
            tradeOffer: { wants: 'soil_reviver', wants_quantity: 1, gives: { id: 'magic_carrot_seeds', name: 'เมล็ดแครอทวิเศษ', icon: '🥕✨', quantity: 3 } }
        });
        
        for(let i=0; i < villager_count; i++) {
             npcs.push({
                id: `villager_${i}`, type: 'villager', name: villagerNames[i % villagerNames.length],
                x: Math.random() * worldWidth, y: Math.random() * worldHeight,
                width: TILE_SIZE, height: TILE_SIZE, health: 50, maxHealth: 50,
                speed: 40 + Math.random() * 20, moveTimer: Math.random() * 10, targetX: null, targetY: null,
                portrait: villagerPortraits[i % villagerPortraits.length],
                dialogue: ["สวัสดี! วันนี้อากาศดีนะ", "หวังว่ามอนสเตอร์พวกนั้นจะไม่มาแถวนี้นะ..."]
            });
        }

        for(let i=0; i < crawler_count; i++) {
            npcs.push({
                id: `blight_crawler_${i}`, type: 'enemy', subType: 'crawler', name: 'ตัวคลานพิษ',
                x: Math.random() * worldWidth, y: Math.random() * worldHeight,
                width: TILE_SIZE * 0.8, height: TILE_SIZE * 0.6,
                speed: 120, health: 50, maxHealth: 50, attackPower: 8, portrait: '👾',
                visionRange: TILE_SIZE * 6, attackRange: TILE_SIZE * 0.8, attackCooldown: 0,
            });
        }
        
        for(let i=0; i < wildman_count; i++) {
            npcs.push({
                id: `wildman_${i}`, type: 'enemy', subType: 'wildman', name: 'คนป่า',
                x: Math.random() * worldWidth, y: Math.random() * worldHeight,
                width: TILE_SIZE, height: TILE_SIZE, speed: 90, health: 80, maxHealth: 80, attackPower: 12, portrait: '👹',
                visionRange: TILE_SIZE * 7, attackRange: TILE_SIZE, attackCooldown: 0,
            });
        }

        if (objective.type === 'kill_boss') {
            if (objective.bossType === 'elder_crawler') {
                npcs.push({
                    id: 'boss_elder_crawler', type: 'enemy', subType: 'crawler', isBoss: true, name: 'ตัวคลานพิษโบราณ',
                    x: worldWidth * 0.5, y: worldHeight * 0.5,
                    width: TILE_SIZE * 1.5, height: TILE_SIZE * 1.2,
                    speed: 90, health: 300, maxHealth: 300, attackPower: 15, portrait: '👾',
                    visionRange: TILE_SIZE * 10, attackRange: TILE_SIZE, attackCooldown: 0,
                });
            } else if (objective.bossType === 'wildman_chieftain') {
                npcs.push({
                    id: 'boss_wildman_chieftain', type: 'enemy', subType: 'wildman', isBoss: true, name: 'หัวหน้าคนป่า',
                    x: worldWidth * 0.7, y: worldHeight * 0.7,
                    width: TILE_SIZE * 1.2, height: TILE_SIZE * 1.2,
                    speed: 110, health: 450, maxHealth: 450, attackPower: 20, portrait: '👹',
                    visionRange: TILE_SIZE * 8, attackRange: TILE_SIZE * 1.2, attackCooldown: 0,
                });
            }
        }

        return npcs;
    }, []);

    const initializeQuests = () => {
        setQuests([
            { id: 'plant_5_trees', title: 'มือใหม่หัดปลูก', desc: 'ปลูกต้นไม้ 5 ต้นเพื่อเริ่มต้น', objective: { type: 'plant_trees', target: 5, current: 0 }, reward: { gold: 50, xp: 20 }, status: 'active' },
            { id: 'clear_10_blight', title: 'ขจัดมลทิน', desc: 'กำจัดแผ่นดินที่เน่าเสีย 10 ช่อง เพื่อฟื้นฟูดิน', objective: { type: 'clear_blight', target: 10, current: 0 }, reward: { gold: 30, xp: 25 }, status: 'active' },
            { id: 'earn_100_gold', title: 'นักธุรกิจมือทอง', desc: 'หาเงินให้ได้ 100 Gold', objective: { type: 'earn_gold', target: 100, current: 0 }, reward: { items: [{ id: 'fertilizer', quantity: 2, name: 'ปุ๋ยเร่งโต', icon: '💩' }], xp: 30 }, status: 'active' },
             { id: 'purge_the_blight', title: 'ปราบปรามความมืด', desc: 'กำจัดมอนสเตอร์ที่เกิดจากมลพิษ 3 ตัว', objective: { type: 'kill_enemy', target: 3, current: 0 }, reward: { gold: 100, xp: 75 }, status: 'active' },
        ]);
    };
    
    const setupLevel = useCallback(async (levelIndex, charType = 'boy', existingPlayer = null) => {
        setLoading(true);
        const levelConfig = LEVELS[levelIndex % LEVELS.length];
        
        setLoadingProgress({ progress: 0, text: `กำลังเข้าสู่ ${levelConfig.name}...` });
        await new Promise(res => setTimeout(res, 50));

        const worldWidth = TILE_SIZE * levelConfig.width_tiles;
        const worldHeight = TILE_SIZE * levelConfig.height_tiles;
        
        setLoadingProgress({ progress: 0.2, text: 'กำลังสร้างภูมิประเทศ...' });
        const {map, objects} = generateMap(levelConfig, levelConfig.pollution);
        await new Promise(res => setTimeout(res, 50));

        setLoadingProgress({ progress: 0.5, text: 'ปลุกชีวิตชีวา...' });
        const npcs = generateNpcs(levelConfig);
        await new Promise(res => setTimeout(res, 50));

        setLoadingProgress({ progress: 0.7, text: 'เตรียมตัวนักผจญภัย...' });
        if (existingPlayer) {
            setPlayer({
                ...existingPlayer,
                x: TILE_SIZE * 2, y: TILE_SIZE * (levelConfig.height_tiles / 2),
                targetX: TILE_SIZE * 2, targetY: TILE_SIZE * (levelConfig.height_tiles / 2),
                activeWeapon: null,
            });
        } else {
            setPlayer({
                x: TILE_SIZE * 2, y: TILE_SIZE * (levelConfig.height_tiles / 2),
                targetX: TILE_SIZE * 2, targetY: TILE_SIZE * (levelConfig.height_tiles / 2),
                width: TILE_SIZE * 0.8, height: TILE_SIZE,
                speed: 220, level: 1, xp: 0, xpToNextLevel: 100,
                gold: 50, water: 20, maxWater: 50,
                health: 100, maxHealth: 100,
                attackPower: 15, attackCooldown: 0, activeWeapon: null,
                skillPoints: 0,
                skills: Object.values(SKILL_TREE).flat().reduce((acc, skill) => ({ ...acc, [skill.id]: 0 }), {}),
                inventory: [
                    { id: 'axe', name: 'ขวาน', icon: '🪓', type: 'tool', quantity: 1 },
                    { id: 'watering_can', name: 'บัวรดน้ำ', icon: '💧', type: 'tool', quantity: 1 },
                    { id: 'tree_planter', name: 'ปลูกต้นไม้', icon: '🌳', type: 'tool', quantity: Infinity },
                ],
                selectedItemIndex: 0,
                charType: charType, isMoving: false, lastFootprint: 0,
                direction: 'down', animFrame: 0, pendingAction: null,
                joystickVector: {x: 0, y: 0}
            });
            initializeQuests();
            setTutorial({ step: 'welcome', isActive: true });
        }
        await new Promise(res => setTimeout(res, 50));

        setWorld(w => ({
            ...w, width: worldWidth, height: worldHeight,
            map: map,
            objects: objects, npcs: npcs,
            particles: [], projectiles: [], weaponDrops: [], pollution: levelConfig.pollution
        }));
        
        setLevelObjective({ ...levelConfig.objective });
        setTime({ day: 1, season: 'summer', dayTimer: 0 });
        setGameOver(false);
        setLevel(levelIndex);

        setLoadingProgress({ progress: 1, text: 'เสร็จสิ้น!' });
        await new Promise(res => setTimeout(res, 500));
        setLoading(false);
    }, [generateMap, generateNpcs]);

    const addPlayerXP = useCallback((amount) => {
        setPlayer(p => {
            if (!p) return null;
            let newXp = p.xp + amount;
            let newLevel = p.level;
            let newXpToNext = p.xpToNextLevel;
            let newSkillPoints = p.skillPoints;

            while (newXp >= newXpToNext) {
                newLevel++;
                newXp -= newXpToNext;
                newXpToNext = Math.floor(newXpToNext * 1.5);
                newSkillPoints++;
                setMessage({ title: "เลเวลอัพ!", text: `ยินดีด้วย! คุณไปถึงเลเวล ${newLevel} แล้ว! ได้รับ 1 แต้มสกิล` });
            }
            return { ...p, xp: newXp, level: newLevel, xpToNextLevel: newXpToNext, skillPoints: newSkillPoints };
        });
    }, []);

    const addItemToInventory = useCallback((itemId, quantity, name = null, icon = null) => {
        setPlayer(p => {
            if (!p) return null;
            const newInventory = [...p.inventory];
            const existingItem = newInventory.find(item => item.id === itemId);
            if (existingItem) {
                if (existingItem.quantity !== Infinity) existingItem.quantity += quantity;
            } else {
                 const shopItem = SHOP_ITEMS.find(si => si.id === itemId);
                 const itemName = name || (shopItem ? shopItem.name : itemId);
                 const itemIcon = icon || (shopItem ? shopItem.icon : '❓');
                 newInventory.push({ id: itemId, name: itemName, icon: itemIcon, quantity, type: 'special' });
            }
            return { ...p, inventory: newInventory };
        });
    }, []);

    const claimReward = useCallback((quest) => {
        let rewardText = '';
        if (quest.reward.gold) {
            setPlayer(p => ({ ...p, gold: p.gold + quest.reward.gold }));
            rewardText += `💰${quest.reward.gold} Gold `;
        }
        if (quest.reward.xp) {
            addPlayerXP(quest.reward.xp);
            rewardText += `✨${quest.reward.xp} XP `;
        }
        if (quest.reward.items) {
            quest.reward.items.forEach(item => {
                addItemToInventory(item.id, item.quantity, item.name, item.icon);
                rewardText += `🎁${item.quantity} ${item.name} `;
            });
        }
        setMessage({ title: `เควสสำเร็จ: ${quest.title}`, text: `คุณได้รับ: ${rewardText}` });
    }, [addPlayerXP, addItemToInventory]);

    const checkQuestCompletion = useCallback((actionType, payload = 1) => {
        setQuests(qs => qs.map(quest => {
            if (quest.status !== 'active') return quest;
    
            let updatedQuest = { ...quest };
            let newCurrent = updatedQuest.objective.current;
    
            if (updatedQuest.objective.type === actionType) {
                 if (actionType === 'earn_gold') {
                     newCurrent = payload; // payload is the new gold total
                 } else {
                    newCurrent += payload; // payload is the amount to add
                 }
            } else if (updatedQuest.objective.type === 'earn_gold') {
                newCurrent = player?.gold || 0;
            }
            
            updatedQuest.objective = { ...updatedQuest.objective, current: Math.min(newCurrent, updatedQuest.objective.target) };
    
            if (updatedQuest.objective.current >= updatedQuest.objective.target && quest.status === 'active') {
                updatedQuest.status = 'completed';
                setTimeout(() => claimReward(updatedQuest), 100);
            }
            return updatedQuest;
        }));
    }, [claimReward, player?.gold]);
    
    const updateLevelObjective = useCallback((amount = 1) => {
        setLevelObjective(obj => {
            if(!obj || obj.current >= obj.target) return obj;
            const newCurrent = Math.min(obj.current + amount, obj.target);
            if (newCurrent >= obj.target) {
                setMessage({ title: "สำเร็จเป้าหมาย!", text: `คุณทำภารกิจของด่านนี้สำเร็จแล้ว! ประตูสู่ด่านต่อไปได้เปิดออก` });
                setWorld(w => {
                    const portalX = w.width * 0.9;
                    const portalY = w.height * 0.5;
                    const newObjects = [...w.objects, { id: 'portal', type: 'portal', x: portalX, y: portalY, width: TILE_SIZE * 2, height: TILE_SIZE * 2 }];
                    return { ...w, objects: newObjects };
                });
            }
            return { ...obj, current: newCurrent };
        });
    }, []);


    const createParticles = useCallback((x, y, count, options) => {
        setWorld(w => {
            const newParticles = [...w.particles];
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * (options.maxSpeed || 80) + (options.minSpeed || 20);
                newParticles.push({
                    id: Math.random(),
                    x, y,
                    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                    lifespan: Math.random() * (options.maxLife || 0.8) + (options.minLife || 0.3),
                    initialLife: options.maxLife || 0.8,
                    color: options.color || 'white',
                    size: Math.random() * (options.maxSize || 4) + (options.minSize || 2),
                    gravity: options.gravity === undefined ? 1.5 : options.gravity,
                });
            }
            return { ...w, particles: newParticles };
        });
    }, []);

    const value = useMemo(() => ({
        player, setPlayer, world, setWorld, time, setTime, quests,
        message, setMessage, activeDialogue, setActiveDialogue,
        setupLevel, addPlayerXP, addItemToInventory, checkQuestCompletion, createParticles,
        isDailyRewardAvailable, setDailyRewardAvailable,
        deviceType, setDeviceType,
        isGameOver, setGameOver, playerActionRef,
        isLoading, loadingProgress,
        mousePos, setMousePos,
        tutorial, setTutorial,
        level, setLevel, levelObjective, updateLevelObjective
    }), [player, world, time, quests, message, activeDialogue, setupLevel, addPlayerXP, addItemToInventory, checkQuestCompletion, createParticles, isDailyRewardAvailable, deviceType, isGameOver, isLoading, loadingProgress, mousePos, tutorial, level, levelObjective, updateLevelObjective]);

    return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

// --- Reusable UI Components ---
interface ModalProps {
    title: React.ReactNode;
    children?: React.ReactNode;
    isOpen: boolean;
    onClose: () => void;
    icon: React.ReactNode;
    size?: string;
}

const Modal = ({ title, children, isOpen, onClose, icon, size = 'size-2xl' }: ModalProps) => {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className={`modal-container ${size}`} onClick={(e) => e.stopPropagation()}>
                <div className="corner-decoration top-left"></div>
                <div className="corner-decoration top-right"></div>
                <div className="corner-decoration bottom-left"></div>
                <div className="corner-decoration bottom-right"></div>
                <div className="modal-header">
                    <h2 className="modal-title">{icon}{title}</h2>
                    <button onClick={onClose} className="modal-close-button" aria-label="Close modal">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>
                    </button>
                </div>
                <div className="modal-content">{children}</div>
            </div>
        </div>
    );
};

const MessageBox = () => {
    const { message, setMessage } = useContext(GameContext);
    if (!message) return null;
    return <Modal title={message.title} isOpen={true} onClose={() => setMessage(null)} icon="✨">
        <p className="modal-message-text">{message.text}</p>
        <div className="modal-actions">
            <button onClick={() => setMessage(null)} className="button primary">ตกลง</button>
        </div>
    </Modal>
}

const ProgressBar = ({ value, max, colorClass, label }: { value: number; max: number; colorClass: string; label?: string; }) => (
    <div className="progress-bar-container">
        {label && <span className="progress-bar-label">{label} ({Math.floor(value)}/{max})</span>}
        <div className="progress-bar-bg">
            <div className={`progress-bar-fg ${colorClass}`} style={{ width: `${(value / max) * 100}%` }}></div>
        </div>
    </div>
);

// --- Game Screens / Pages ---
const LoadingScreen = () => {
    const { loadingProgress } = useContext(GameContext);
    const tips = [
        "เคล็ดลับ: การกำจัดแผ่นดินที่เน่าเสีย (Blight) จะช่วยลดมลพิษโดยรวม!",
        "เคล็ดลับ: อย่าลืมรดน้ำต้นไม้เพื่อให้มันโตเร็วขึ้น",
        "เคล็ดลับ: ทำเควสให้สำเร็จเพื่อรับทองและ XP!",
        "เคล็ดลับ: ระวังตัวจากคนป่า พวกมันไม่เป็นมิตร!",
        "เคล็ดลับ: อัปเกรดสกิลเพื่อเพิ่มความสามารถของคุณ",
    ];
    const [tip, setTip] = useState(tips[0]);

    useEffect(() => {
        const interval = setInterval(() => {
            setTip(tips[Math.floor(Math.random() * tips.length)]);
        }, 5000);
        return () => clearInterval(interval);
    }, []);
    
    return (
        <div className="loading-screen">
            <div className="loading-content">
                <h2 className="page-title">กำลังโหลด...</h2>
                <div className="loading-bar-container">
                    <div className="loading-bar" style={{ width: `${loadingProgress.progress * 100}%` }}></div>
                </div>
                <p className="loading-text">{loadingProgress.text}</p>
                <p className="loading-tip">{tip}</p>
            </div>
        </div>
    );
};


const StartScreen = ({ onStart, onNavigate }) => (
    <div className="start-screen">
        <div className="parallax-bg">
            <div className="parallax-layer layer-1"></div>
            <div className="parallax-layer layer-2"></div>
            <div className="parallax-layer layer-3"></div>
            <div className="parallax-layer layer-4"></div>
        </div>
        <div className="fireflies">
            {[...Array(20)].map((_, i) => <div key={i} className="firefly"></div>)}
        </div>
        <div className="start-screen-content">
            <h1 className="title-glow">ผู้พิทักษ์ไพรสวรรค์</h1>
            <p>Guardian of the Celestial Forest</p>
            <div className="start-menu-buttons">
                <button onClick={onStart} className="button primary large pulse-button">เริ่มการผจญภัย</button>
                <button onClick={() => onNavigate('how-to-play')} className="button secondary">วิธีเล่น</button>
            </div>
        </div>
    </div>
);

const GameOverScreen = ({ onRestart }) => (
     <div className="game-over-screen">
         <div className="game-over-content">
             <h2 className="page-title">เกมจบแล้ว</h2>
             <p className="page-subtitle">ความพยายามของคุณยอดเยี่ยมมาก! แต่ป่าต้องการคุณอีกครั้ง</p>
             <div className="modal-actions">
                <button onClick={onRestart} className="button primary large">เล่นอีกครั้ง</button>
            </div>
         </div>
     </div>
);

const DeviceSelectScreen = ({ onConfirm, onBack }) => (
    <div className="device-select-screen">
        <div className="device-select-content">
            <h2 className="page-title">คุณกำลังเล่นบนอุปกรณ์ใด?</h2>
            <p className="page-subtitle">การเลือกนี้จะช่วยปรับปรุงการควบคุมและ UI ให้เหมาะสมกับคุณ</p>
            <div className="device-options">
                <button onClick={() => onConfirm('desktop')} className="button primary large device-option">
                    <span className="device-icon">🖥️</span>
                    <span>เดสก์ท็อป</span>
                </button>
                <button onClick={() => onConfirm('mobile')} className="button primary large device-option">
                    <span className="device-icon">📱</span>
                    <span>มือถือ</span>
                </button>
            </div>
             <div className="modal-actions">
                <button onClick={onBack} className="button secondary">กลับ</button>
            </div>
        </div>
    </div>
);


const CharacterSelectScreen = ({ onConfirm, onBack }) => {
    const [selectedChar, setSelectedChar] = useState(null);
    return (
        <div className="character-select-screen">
            <div className="character-select-content">
                <h2 className="page-title">เลือกผู้พิทักษ์ของคุณ</h2>
                <div className="character-options">
                    {Object.entries(CHAR_TYPES).map(([key, { name, sprite }]) => (
                         <div key={key} onClick={() => setSelectedChar(key)} className={`character-option ${selectedChar === key ? 'selected' : ''}`}>
                             <div className="character-sprite">{sprite}</div>
                             <p>{name}</p>
                         </div>
                    ))}
                </div>
                <div className="modal-actions">
                     <button onClick={onBack} className="button secondary">กลับ</button>
                     <button onClick={() => onConfirm(selectedChar)} disabled={!selectedChar} className="button primary">ยืนยัน</button>
                </div>
            </div>
        </div>
    );
};

const HowToPlayScreen = ({ onBack }) => (
    <div className="how-to-play-screen">
        <div className="how-to-play-content">
            <h2 className="page-title">วิธีเล่น: ผู้พิทักษ์ไพรสวรรค์</h2>
            <div className="info-sections">
                <div className="info-section"><h3><span className="icon">🎯</span> <b>เป้าหมาย:</b> ฟื้นฟูป่า, ทำภารกิจของด่านให้สำเร็จ, และเปิดประตูมิติสู่ด่านต่อไป!</h3></div>
                <div className="info-section">
                    <h3><span className="icon">🖱️</span> <b>การควบคุม (เดสก์ท็อป):</b></h3>
                    <p>• <b>คลิกเมาส์:</b> เคลื่อนที่, โจมตีศัตรู, หรือโต้ตอบกับสิ่งของ</p>
                    <p>• <b>การโยนขวาน:</b> ขวานจะถูกโยนไปในทิศทางของเคอร์เซอร์เมาส์</p>
                </div>
                 <div className="info-section">
                    <h3><span className="icon">📱</span> <b>การควบคุม (มือถือ):</b></h3>
                     <p>• <b>จอยสติ๊ก (ซ้าย):</b> ใช้เพื่อเคลื่อนที่</p>
                     <p>• <b>ปุ่ม Action (A):</b> ใช้เพื่อโต้ตอบ, โจมตี, หรือใช้ไอเทมที่เลือกไว้</p>
                </div>
                <div className="info-section">
                    <h3><span className="icon">⚔️</span> <b>อาวุธพิเศษ:</b></h3>
                    <p>• <span className="icon-text">🔪</span><b>มีดพราน:</b> โจมตีระยะใกล้ได้รวดเร็ว ดรอปจากศัตรู</p>
                    <p>• <span className="icon-text">🔫</span><b>ปืนพก:</b> ยิงระยะไกลได้รุนแรง แต่มีกระสุนจำกัด</p>
                </div>
                 <div className="info-section"><h3><span className="icon">💡</span> <b>เคล็ดลับ:</b> ทำเควส (📜), อัปสกิล (🧠), ซื้อของ (🛒) และอย่าลืมหมุนวงล้อเสี่ยงโชครายวัน (🎁)!</h3></div>
            </div>
            <div className="modal-actions">
                <button onClick={onBack} className="button primary">กลับไปหน้าหลัก</button>
            </div>
        </div>
    </div>
);

// --- In-Game UI Components ---
const HUD = ({ onOpenModal }) => {
    const { player, time, world, isDailyRewardAvailable, levelObjective, level, setPlayer, tutorial, setTutorial } = useContext(GameContext);
    
    if (!player) return null;
    
    const remainingTime = DAY_LENGTH_SECONDS - time.dayTimer;
    const minutes = Math.floor(remainingTime / 60);
    const seconds = Math.floor(remainingTime % 60);
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    const dailyRewardButton = (
        <button onClick={() => onOpenModal('daily-reward')} className={`hud-icon-button daily-reward ${isDailyRewardAvailable ? 'available' : ''}`} title="รางวัลล็อกอินรายวัน">🎁</button>
    );
    
    const activeWeaponInfo = player.activeWeapon ? (
        <div className="active-weapon-info">
            {player.activeWeapon.type === 'knife' && `🔪 ${Math.ceil(player.activeWeapon.duration)}s`}
            {player.activeWeapon.type === 'gun' && `🔫 ${player.activeWeapon.ammo}`}
        </div>
    ) : null;

    const objectiveText = levelObjective ? `เป้าหมาย: ${LEVELS[level].objective.type === 'kill_boss' ? `กำจัด ${LEVELS[level].name === "ทุ่งหญ้าเขียวขจี" ? "ตัวคลานพิษโบราณ" : "หัวหน้าคนป่า"}` : ''} (${levelObjective.current}/${levelObjective.target})` : "สำรวจพื้นที่";


    return (
        <>
            {/* Mobile HUD */}
            <div className="hud mobile-hud">
                 <div className="mobile-hud-top">
                    <div className="mobile-hud-stats">
                        <div className="stat-row">
                            <span className="font-bold">LV: {player.level}</span>
                            <div className="stat-item text-purple">🧠 {player.skillPoints}</div>
                        </div>
                        <ProgressBar value={player.xp} max={player.xpToNextLevel} colorClass="bg-green" />
                        <ProgressBar value={player.health} max={player.maxHealth} colorClass="bg-red" />
                    </div>
                    <div className="hud-divider"></div>
                    <div className="mobile-hud-resources">
                        <div className="stat-item text-yellow">💰 {player.gold}</div>
                        <div className="stat-item text-blue">💧 {player.water}/{player.maxWater}</div>
                         {activeWeaponInfo}
                    </div>
                </div>
                 <div className="mobile-hud-bottom">
                    <span>{SEASONS[time.season].icon} {SEASONS[time.season].name} (วันที่ {time.day})</span>
                    <span className="font-bold">⏳ {timeString}</span>
                </div>
            </div>

            {/* Desktop HUD */}
            <div className="hud desktop-hud-left">
                 <ProgressBar value={player.health} max={player.maxHealth} colorClass="bg-red" label={`HP`} />
                <div className="flex items-center justify-between">
                    <span className="font-bold text-lg">เลเวล: {player.level}</span>
                    <div className="stat-item text-purple">🧠 {player.skillPoints}</div>
                </div>
                <ProgressBar value={player.xp} max={player.xpToNextLevel} colorClass="bg-green" />
                <div className="flex justify-between items-center text-lg">
                    <div className="stat-item text-yellow">💰 {player.gold}</div>
                    <div className="stat-item text-blue">💧 {player.water}/{player.maxWater}</div>
                    {activeWeaponInfo}
                </div>
            </div>

            <div className="hud desktop-hud-right">
                <div className="desktop-hud-time">
                    <span>{SEASONS[time.season].icon} {SEASONS[time.season].name} - วันที่: {time.day}</span>
                     <span className="font-bold">⏳ {timeString}</span>
                </div>
                <div className="desktop-hud-buttons">
                    {dailyRewardButton}
                    <button onClick={() => onOpenModal('skill-tree')} className="hud-icon-button" title="อัปเกรดสกิล">🧠</button>
                    <button onClick={() => onOpenModal('quest-log')} className="hud-icon-button" title="สมุดเควส">📜</button>
                    <button onClick={() => onOpenModal('shop')} className="hud-icon-button" title="ร้านค้า">🛒</button>
                    <button onClick={() => onOpenModal('redemption-hub')} className="hud-icon-button" title="ศูนย์แลกรางวัล">💳</button>
                </div>
            </div>
            
             <div className="hud main-objective-hud">
                <p>{objectiveText}</p>
            </div>

            <div className="hud pollution-meter">
                <span className="pollution-label">ระดับมลพิษ</span>
                <ProgressBar value={(1 - world.pollution)} max={1} colorClass="bg-pollution-gradient" />
            </div>

            <div className="toolbar">
                {player.inventory.map((item, index) => (
                    <div key={item.id + index}
                        onClick={() => {
                            setPlayer(p => ({ ...p, selectedItemIndex: index }));
                            if (tutorial.isActive && tutorial.step === 'select_item') {
                                setTutorial({ ...tutorial, step: 'use_item' });
                            }
                        }}
                        id={`tool-slot-${index}`}
                        className={`tool-slot ${player.selectedItemIndex === index ? 'selected' : ''}`}
                        title={item.name}
                    >
                        {item.icon}
                        {item.quantity && item.quantity !== Infinity && (
                            <span className="item-count">{item.quantity}</span>
                        )}
                    </div>
                ))}
                <div className="tool-slot mobile-menu-button" onClick={() => onOpenModal('mobile-menu')}>
                    ☰
                </div>
            </div>
        </>
    );
};

const MobileControls = () => {
    const { deviceType, playerActionRef, setPlayer } = useContext(GameContext);
    const joyRef = useRef(null);
    const stickRef = useRef(null);
    const context = useContext(GameContext);

    const handleTouchStart = useCallback((e) => {
        const touch = e.touches[0];
        stickRef.current.style.transition = '0s';
        joyRef.current.style.left = `${touch.clientX - 50}px`;
        joyRef.current.style.top = `${touch.clientY - 50}px`;
        joyRef.current.style.display = 'block';
    }, []);

    const handleTouchMove = useCallback((e) => {
        const touch = e.touches[0];
        const joyRect = joyRef.current.getBoundingClientRect();
        const centerX = joyRect.left + joyRect.width / 2;
        const centerY = joyRect.top + joyRect.height / 2;
        
        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        const dist = Math.min(40, Math.hypot(dx, dy));
        const angle = Math.atan2(dy, dx);
        
        const stickX = dist * Math.cos(angle);
        const stickY = dist * Math.sin(angle);
        
        stickRef.current.style.transform = `translate(${stickX}px, ${stickY}px)`;
        
        setPlayer(p => {
            if (p) {
                if (context.tutorial.isActive && context.tutorial.step === 'move') {
                    context.setTutorial({ ...context.tutorial, step: 'select_item' });
                }
                return {...p, joystickVector: { x: dx / 40, y: dy / 40 }};
            }
            return p;
        });

    }, [setPlayer, context]);

    const handleTouchEnd = useCallback(() => {
        joyRef.current.style.display = 'none';
        stickRef.current.style.transition = '0.2s';
        stickRef.current.style.transform = `translate(0px, 0px)`;
        setPlayer(p => p ? {...p, joystickVector: { x: 0, y: 0 }} : p);
    }, [setPlayer]);

    if (deviceType !== 'mobile') return null;

    return (
        <>
            <div className="touch-area" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}></div>
            <div ref={joyRef} className="virtual-joystick-container">
                <div ref={stickRef} className="joystick-stick"></div>
            </div>
            <button id="action-button" onPointerDown={(e) => { e.preventDefault(); playerActionRef.current?.(); }} className="action-button">
                A
            </button>
        </>
    )
}

const MobileMenuModal = ({ isOpen, onClose, onOpenModal }) => {
    const { isDailyRewardAvailable } = useContext(GameContext);
    const handleMenuClick = (modal) => {
        onClose();
        onOpenModal(modal);
    };

    return (
        <Modal title="เมนู" icon="☰" isOpen={isOpen} onClose={onClose} size="size-xs">
            <div className="mobile-menu-grid">
                <button onClick={() => handleMenuClick('skill-tree')} className="mobile-menu-grid-button"><span>🧠</span><span>สกิล</span></button>
                <button onClick={() => handleMenuClick('quest-log')} className="mobile-menu-grid-button"><span>📜</span><span>เควส</span></button>
                <button onClick={() => handleMenuClick('shop')} className="mobile-menu-grid-button"><span>🛒</span><span>ร้านค้า</span></button>
                <button onClick={() => handleMenuClick('redemption-hub')} className="mobile-menu-grid-button"><span>💳</span><span>แลกรางวัล</span></button>
                 <button onClick={() => handleMenuClick('daily-reward')} className={`mobile-menu-grid-button daily-reward ${isDailyRewardAvailable ? 'available' : ''}`}><span>🎁</span><span>รางวัลรายวัน</span></button>
            </div>
        </Modal>
    );
};

const DailyWheelModal = ({ isOpen, onClose }) => {
    const { setPlayer, setMessage, setDailyRewardAvailable, setGameOver, addItemToInventory } = useContext(GameContext);
    const [isSpinning, setSpinning] = useState(false);
    const [finalAngle, setFinalAngle] = useState(0);
    const wheelRef = useRef(null);

    const handleSpin = () => {
        if (isSpinning) return;

        const segmentCount = WHEEL_SEGMENTS.length;
        const segmentAngle = 360 / segmentCount;
        const randomIndex = Math.floor(Math.random() * segmentCount);
        const winningSegment = WHEEL_SEGMENTS[randomIndex];

        const randomSpins = 5 + Math.floor(Math.random() * 5);
        const angle = (randomSpins * 360) - (randomIndex * segmentAngle) - (segmentAngle / 2) + (Math.random() * segmentAngle * 0.8 - segmentAngle * 0.4);

        setSpinning(true);
        setFinalAngle(angle);

        setTimeout(() => {
            setSpinning(false);
            setDailyRewardAvailable(false);
            localStorage.setItem('lastLoginDate', new Date().toDateString());
            
            const messageTitle = winningSegment.type === 'bomb' ? 'โชคร้าย!' : 'คุณได้รับ...';
            const messageText = `คุณหมุนได้: ${winningSegment.icon} ${winningSegment.label}`;
            setMessage({ title: messageTitle, text: messageText });

            if (winningSegment.type === 'gold') {
                setPlayer(p => ({ ...p, gold: p.gold + winningSegment.value }));
            } else if (winningSegment.type === 'item') {
                const shopItem = SHOP_ITEMS.find(i => i.id === winningSegment.value);
                addItemToInventory(winningSegment.value, winningSegment.quantity, shopItem?.name, winningSegment.icon);
            } else if (winningSegment.type === 'bomb') {
                 setTimeout(() => setGameOver(true), 2000);
            }
            setTimeout(onClose, 2000);
        }, 6000); 
    };

    const conicGradient = useMemo(() => {
        let gradient = 'conic-gradient(';
        let currentAngle = 0;
        const anglePerSegment = 360 / WHEEL_SEGMENTS.length;
        WHEEL_SEGMENTS.forEach((seg, i) => {
            gradient += `${seg.color} ${currentAngle}deg ${currentAngle + anglePerSegment}deg`;
            if (i < WHEEL_SEGMENTS.length -1) {
                gradient += ', ';
            }
            currentAngle += anglePerSegment;
        });
        gradient += ')';
        return gradient;
    }, []);

    return (
        <Modal title="วงล้อเสี่ยงโชค" icon="🎁" isOpen={isOpen} onClose={onClose} size="size-md">
            <div className="daily-wheel-wrapper">
                <div className="wheel-pointer">▼</div>
                <div ref={wheelRef} className="wheel-container">
                    <div className="wheel" style={{ transform: `rotate(${finalAngle}deg)`, transition: isSpinning ? `transform 6s cubic-bezier(0.25, 1, 0.5, 1)` : 'none', background: conicGradient }}>
                        {WHEEL_SEGMENTS.map((seg, i) => {
                            const angle = (360 / WHEEL_SEGMENTS.length) * i + (360 / WHEEL_SEGMENTS.length / 2);
                            return (
                                <div key={i} className="segment-label-container" style={{ transform: `rotate(${angle}deg)` }}>
                                    <div className="segment-label">
                                        <span className="segment-icon">{seg.icon}</span>
                                        <span>{seg.label}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="modal-actions">
                <button onClick={handleSpin} disabled={isSpinning} className="button primary large">
                    {isSpinning ? 'กำลังหมุน...' : 'หมุนเลย!'}
                </button>
            </div>
        </Modal>
    );
};


const ShopModal = ({ isOpen, onClose }) => {
    const context = useContext(GameContext);
    const { player, setPlayer, setMessage } = context;

    const handleBuy = (item) => {
        if (player.gold >= item.price) {
            setPlayer(p => ({ ...p, gold: p.gold - item.price }));
            item.action(context);
            setMessage({ title: "ซื้อสำเร็จ", text: `คุณได้ซื้อ ${item.name} แล้ว!` });
        } else {
            setMessage({ title: "โกลด์ไม่พอ!", text: "คุณมีโกลด์ไม่เพียงพอสำหรับซื้อไอเทมชิ้นนี้" });
        }
    };

    return (
        <Modal title="ร้านค้าของรัสตี้" icon={'🛒'} isOpen={isOpen} onClose={onClose} size="size-4xl">
            <div className="shop-grid">
                {SHOP_ITEMS.map(item => (
                    <div key={item.id} className="shop-item">
                        <div className="shop-item-info">
                            <div className="shop-item-icon">{item.icon}</div>
                            <span>{item.name}</span>
                        </div>
                        <button onClick={() => handleBuy(item)} disabled={player.gold < item.price} className="button success">
                            <span>💰</span> {item.price}
                        </button>
                    </div>
                ))}
            </div>
        </Modal>
    );
};

const RedemptionHubModal = ({ isOpen, onClose }) => {
    const { player, setPlayer, setMessage } = useContext(GameContext);
    const [activeTab, setActiveTab] = useState('vouchers');

    const handleRedeem = (item) => {
        if (player.gold >= item.price) {
            setPlayer(p => ({ ...p, gold: p.gold - item.price }));
            const randomCode = `ECO-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
            setMessage({ 
                title: "แลกรางวัลสำเร็จ!", 
                text: `คุณได้รับ "${item.name}"! รหัสของคุณคือ: ${randomCode}. รายละเอียดถูกส่งไปที่อีเมลของคุณแล้ว (สมมติ)`
            });
        } else {
            setMessage({ title: "โกลด์ไม่พอ!", text: `คุณต้องมี ${item.price} Gold เพื่อแลกรางวัลนี้` });
        }
    };

    const renderTabContent = () => {
        const items = REDEMPTION_ITEMS[activeTab];
        return (
            <div className="redemption-grid">
                {items.map(item => (
                    <div key={item.id} className="redemption-card">
                        <div className={`redemption-card-icon ${item.brandClass || ''}`}>{item.icon}</div>
                        <div className="redemption-card-body">
                            <h4 className="redemption-card-title">{item.name}</h4>
                            {item.description && <p className="redemption-card-desc">{item.description}</p>}
                        </div>
                        <div className="redemption-card-footer">
                             <button onClick={() => handleRedeem(item)} disabled={player.gold < item.price} className="button accent">
                                <span>💰 {item.price}</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    
    if(!player) return null;

    return (
        <Modal title="ศูนย์แลกรางวัล" icon={'💳'} isOpen={isOpen} onClose={onClose} size="size-5xl">
            <div className="redemption-hub-container">
                <div className="redemption-header">
                    <div className="tabs">
                        <button className={`tab-button ${activeTab === 'vouchers' ? 'active' : ''}`} onClick={() => setActiveTab('vouchers')}>บัตรกำนัล</button>
                        <button className={`tab-button ${activeTab === 'discounts' ? 'active' : ''}`} onClick={() => setActiveTab('discounts')}>ส่วนลด</button>
                        <button className={`tab-button ${activeTab === 'upgrades' ? 'active' : ''}`} onClick={() => setActiveTab('upgrades')}>อัปเกรดถาวร</button>
                    </div>
                    <div className="player-gold-display">
                        ทองของคุณ: 💰 {player.gold}
                    </div>
                </div>
                {renderTabContent()}
            </div>
        </Modal>
    );
};


const QuestLogModal = ({ isOpen, onClose }) => {
    const { quests } = useContext(GameContext);
    const activeQuests = quests.filter(q => q.status === 'active');

    return (
        <Modal title="สมุดเควส" icon={'📜'} isOpen={isOpen} onClose={onClose}>
            {activeQuests.length === 0 ? (
                <p className="modal-description">ไม่มีเควสในขณะนี้</p>
            ) : (
                <div className="list-container">
                    {activeQuests.map(quest => (
                        <div key={quest.id} className="list-item-column">
                            <h4 className="list-item-title accent-text">{quest.title}</h4>
                            <p className="list-item-desc">{quest.desc}</p>
                            <ProgressBar value={quest.objective.current} max={quest.objective.target} colorClass="bg-blue" label={`${quest.objective.current} / ${quest.objective.target}`} />
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
};

const SkillTreeModal = ({ isOpen, onClose }) => {
    const { player, setPlayer } = useContext(GameContext);

    const handleUnlockSkill = (skillId) => {
        if (player.skillPoints > 0) {
            setPlayer(p => {
                const currentLevel = p.skills[skillId];
                const skillBranch = Object.values(SKILL_TREE).flat().find(s => s.id === skillId);
                if (!skillBranch || currentLevel >= skillBranch.maxLevel) return p;
                
                const newSkills = { ...p.skills, [skillId]: currentLevel + 1 };
                let newMaxWater = p.maxWater;
                if (skillId === 'water_capacity') newMaxWater += 25;
                
                return { ...p, skillPoints: p.skillPoints - 1, skills: newSkills, maxWater: newMaxWater };
            });
        }
    };

    return (
        <Modal title={`สมุดสกิล (แต้มเหลือ: ${player?.skillPoints})`} icon={'🧠'} isOpen={isOpen} onClose={onClose}>
            <div className="skill-tree-container">
                {Object.entries(SKILL_TREE).map(([branchName, skills]) => (
                    <div key={branchName}>
                        <h3 className="skill-branch-title">{branchName}</h3>
                        <div className="list-container">
                            {skills.map(skill => {
                                const currentLevel = player.skills[skill.id];
                                const canUnlock = player.skillPoints > 0 && currentLevel < skill.maxLevel;
                                return (
                                    <div key={skill.id} className={`list-item-split ${!canUnlock ? 'disabled' : ''}`}>
                                        <div>
                                            <h4 className="list-item-title">{skill.name} <span className="text-yellow">({currentLevel}/{skill.maxLevel})</span></h4>
                                            <p className="list-item-desc">{skill.desc}</p>
                                        </div>
                                        <button onClick={() => handleUnlockSkill(skill.id)} disabled={!canUnlock} className="button accent">อัปเกรด</button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </Modal>
    );
};

const DialogueBox = () => {
    const { activeDialogue, setActiveDialogue, setPlayer, player, addItemToInventory, setMessage } = useContext(GameContext);
    const [textIndex, setTextIndex] = useState(0);

    useEffect(() => { setTextIndex(0); }, [activeDialogue]);

    if (!activeDialogue) return null;

    const { npc } = activeDialogue;
    const currentText = npc.dialogue[textIndex];
    const isLastText = textIndex >= npc.dialogue.length - 1;

    const handleNext = () => {
        if (!isLastText) {
            setTextIndex(textIndex + 1);
        } else {
            setActiveDialogue(null);
        }
    };
    
    const handleTrade = () => {
        const { wants, wants_quantity, gives } = npc.tradeOffer;
        const playerItem = player.inventory.find(i => i.id === wants);

        if (playerItem && playerItem.quantity >= wants_quantity) {
             setPlayer(p => {
                const newInventory = [...p.inventory];
                const itemIndex = newInventory.findIndex(i => i.id === wants);
                if(newInventory[itemIndex].quantity === wants_quantity) {
                    newInventory.splice(itemIndex, 1);
                } else {
                    newInventory[itemIndex].quantity -= wants_quantity;
                }
                return {...p, inventory: newInventory};
            });
            addItemToInventory(gives.id, gives.quantity, gives.name, gives.icon);
            setMessage({ title: 'แลกเปลี่ยนสำเร็จ!', text: `คุณได้รับ ${gives.name} x${gives.quantity}!`});
            setActiveDialogue(null);
        } else {
            setMessage({ title: 'ของไม่พอ!', text: `คุณต้องการ ${wants} x${wants_quantity} เพื่อแลกเปลี่ยน`});
        }
    };

    return (
        <div className="dialogue-box">
            <div className="dialogue-portrait">{npc.portrait}</div>
            <div className="dialogue-content">
                <h3 className="dialogue-name">{npc.name}</h3>
                <p className="dialogue-text">{currentText}</p>
            </div>
            <div className="dialogue-actions">
                {isLastText && npc.tradeOffer && <button onClick={handleTrade} className="button success">แลกเปลี่ยน</button>}
                <button onClick={handleNext} className="button primary">
                    {isLastText ? 'ปิด' : 'ต่อไป'}
                </button>
            </div>
        </div>
    );
};

const TutorialOverlay = () => {
    const { tutorial, setTutorial } = useContext(GameContext);
    if (!tutorial.isActive) return null;

    const getTutorialBoxStyle = () => {
        const style: React.CSSProperties = { position: 'absolute' };
        let targetElement;
        
        switch(tutorial.step) {
            case 'welcome':
                style.top = '20%'; style.left = '50%'; style.transform = 'translateX(-50%)';
                break;
            case 'move':
                style.bottom = '25%'; style.left = '25%'; style.transform = 'translateX(-50%)';
                break;
            case 'select_item':
                targetElement = document.getElementById('tool-slot-2');
                if (targetElement) {
                    const rect = targetElement.getBoundingClientRect();
                    style.bottom = `${window.innerHeight - rect.top}px`;
                    style.left = `${rect.left + rect.width / 2}px`;
                    style.transform = 'translateX(-50%)';
                }
                break;
            case 'use_item':
                style.top = '40%'; style.left = '50%'; style.transform = 'translateX(-50%)';
                break;
            case 'combat':
                targetElement = document.getElementById('tool-slot-0');
                 if (targetElement) {
                    const rect = targetElement.getBoundingClientRect();
                    style.bottom = `${window.innerHeight - rect.top}px`;
                    style.left = `${rect.left + rect.width / 2}px`;
                    style.transform = 'translateX(-50%)';
                }
                break;
            case 'objective':
                 targetElement = document.querySelector('.main-objective-hud');
                 if (targetElement) {
                    const rect = targetElement.getBoundingClientRect();
                    style.top = `${rect.bottom + 10}px`;
                    style.left = `${rect.left + rect.width / 2}px`;
                    style.transform = 'translateX(-50%)';
                }
                break;
            default:
                style.display = 'none';
        }
        return style;
    };

    const getTutorialHighlightStyle = (step) => {
        let targetId = '';
        if (step === 'move') targetId = 'touch-area-highlight';
        if (step === 'select_item') targetId = 'tool-slot-2';
        if (step === 'combat') targetId = 'tool-slot-0';
        if (step === 'use_item') targetId = 'action-button';
        if (step === 'objective') targetId = '.main-objective-hud';

        const element = targetId.startsWith('.') ? document.querySelector(targetId) : document.getElementById(targetId);
        if (!element) return {};
        
        const rect = element.getBoundingClientRect();
        return {
            position: 'absolute',
            left: `${rect.left - 8}px`, top: `${rect.top - 8}px`,
            width: `${rect.width + 16}px`, height: `${rect.height + 16}px`,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.7), 0 0 15px 5px #facc15',
            borderRadius: '1rem',
            pointerEvents: 'none',
            transition: 'all 0.3s ease'
        };
    };

    const TUTORIAL_TEXT = {
        welcome: { text: "ยินดีต้อนรับสู่ไพรสวรรค์! มาเริ่มเรียนรู้วิธีฟื้นฟูป่ากันเถอะ", button: "ต่อไป" },
        move: { text: "ใช้เมาส์คลิก หรือจอยสติ๊ก (มือถือ) เพื่อเคลื่อนที่ ลองเดินไปรอบๆ ดูสิ!", button: null },
        select_item: { text: "เยี่ยมมาก! ตอนนี้เลือกเครื่องมือ 'ปลูกต้นไม้' จากแถบเครื่องมือด้านล่าง", button: null },
        use_item: { text: "ดีเลย! คลิกบนพื้นหญ้า (หรือกดปุ่ม A บนมือถือ) เพื่อปลูกต้นไม้", button: null },
        combat: { text: "มีมอนสเตอร์อยู่แถวนี้! เลือกขวานแล้วคลิกที่ศัตรู (หรือกด A) เพื่อโจมตี", button: null },
        objective: { text: "ยอดเยี่ยม! ดูที่เป้าหมายหลักของคุณด้านบนสุดของจอ ทำมันให้สำเร็จเพื่อไปยังด่านต่อไป ขอให้โชคดี!", button: "เริ่มการผจญภัย!" },
    };

    const currentTutorial = TUTORIAL_TEXT[tutorial.step];
    if (!currentTutorial) return null;

    const handleNext = () => {
        if (tutorial.step === 'welcome') setTutorial({ ...tutorial, step: 'move' });
        else if (tutorial.step === 'objective') setTutorial({ isActive: false, step: 'done' });
    };

    return (
        <div className="tutorial-overlay">
            <div style={getTutorialHighlightStyle(tutorial.step)}></div>
            <div className="tutorial-box" style={getTutorialBoxStyle()}>
                <p>{currentTutorial.text}</p>
                {currentTutorial.button && <button onClick={handleNext} className="button primary">{currentTutorial.button}</button>}
            </div>
        </div>
    )
};


// --- The Main Game Canvas Component ---
const GameCanvas = () => {
    const canvasRef = useRef(null);
    const context = useContext(GameContext);
    const { player, world, time, setPlayer, setTime, setWorld, addPlayerXP, checkQuestCompletion, createParticles, setActiveDialogue, setGameOver, isGameOver, deviceType, playerActionRef, setMousePos, setupLevel, level, updateLevelObjective, tutorial, setTutorial } = context;
    const stateRef = useRef();
    stateRef.current = { player, world, time, isGameOver, level, tutorial };
    let weaponDropTimer = 5;

    const executeInteraction = useCallback((p, tileX, tileY) => {
        const selectedItem = p.inventory[p.selectedItemIndex];
        const objectOnTile = world.objects.find(obj => Math.floor(obj.x / TILE_SIZE) === tileX && Math.floor(obj.y / TILE_SIZE) === tileY);
        const groundTile = world.map[tileY]?.[tileX];
        
        let didAction = false;

        if (objectOnTile) {
            if (selectedItem.id === 'watering_can' && objectOnTile.type === 'tree' && objectOnTile.growth < 1) {
                if (player.water > 0) {
                    setWorld(w => ({ ...w, objects: w.objects.map(o => o.id === objectOnTile.id ? { ...o, waterLevel: 1 } : o) }));
                    setPlayer(currentPlayer => ({...currentPlayer, water: currentPlayer.water - 1}));
                    createParticles(objectOnTile.x + TILE_SIZE/2, objectOnTile.y + TILE_SIZE/2, 15, { color: 'rgba(52, 152, 219, 0.7)', minSize: 3, maxSize: 6, gravity: 2 });
                    didAction = true;
                }
            } else if (selectedItem.id === 'axe' && objectOnTile.type === 'tree' && objectOnTile.growth >= 1) {
                 setWorld(w => ({ ...w, objects: w.objects.filter(o => o.id !== objectOnTile.id), map: w.map.map((row, y) => y !== tileY ? row : row.map((tile, x) => x !== tileX ? tile : { ...tile, type: 'grass' })) }));
                 const goldGained = 15;
                 setPlayer(currentPlayer => ({ ...currentPlayer, gold: currentPlayer.gold + goldGained }));
                 addPlayerXP(10);
                 checkQuestCompletion('earn_gold', p.gold + goldGained);
                 createParticles(objectOnTile.x + TILE_SIZE/2, objectOnTile.y + TILE_SIZE/2, 20, { color: '#ffd700', minSize: 2, maxSize: 5, maxLife: 0.8, gravity: 1 });
                 didAction = true;
            } else if (objectOnTile.type === 'portal') {
                const nextLevel = level + 1;
                setupLevel(nextLevel, p.charType, p);
            }
        } else if (groundTile) {
            if (selectedItem.id === 'axe' && groundTile.type === 'blight') {
                createParticles(tileX * TILE_SIZE + TILE_SIZE/2, tileY * TILE_SIZE + TILE_SIZE/2, 10, { color: '#8d6e63', maxSpeed: 60 });
                setWorld(w => ({ ...w, map: w.map.map((row, y) => y === tileY ? row.map((tile, x) => x === tileX ? { type: 'grass' } : tile) : row), pollution: Math.max(0, w.pollution - 0.005) }));
                addPlayerXP(2);
                checkQuestCompletion('clear_blight', 1);
                didAction = true;
            } else if (selectedItem.id.includes('planter') && (groundTile.type === 'grass' || groundTile.type === 'forest_floor')) {
                 const newTree = { id: `tree_${tileX}_${tileY}`, type: 'tree', x: tileX * TILE_SIZE, y: tileY * TILE_SIZE, growth: 0, growthTime: 30, waterLevel: 0, width: TILE_SIZE, height: TILE_SIZE };
                 setWorld(w => ({ ...w, objects: [...w.objects, newTree], map: w.map.map((row, y) => y === tileY ? row.map((tile, x) => x === tileX ? { type: 'planted_soil' } : tile) : row), pollution: Math.max(0, w.pollution - 0.01) }));
                 checkQuestCompletion('plant_trees', 1);
                 didAction = true;
            }
        }
        
        if (didAction && tutorial.isActive && tutorial.step === 'use_item') {
            setTutorial({...tutorial, step: 'combat'});
        }

    }, [world, player, level, setPlayer, setWorld, createParticles, addPlayerXP, checkQuestCompletion, setupLevel, tutorial, setTutorial]);

    const performAction = useCallback((clickPos = null) => {
        const {player: p, world: w} = stateRef.current;
        if (!p || p.attackCooldown > 0) return;
        
        const selectedItem = p.inventory[p.selectedItemIndex];
        let actionRange = TILE_SIZE * 0.75;
        let targetX = p.x + p.width/2;
        let targetY = p.y + p.height/2;

        if(p.activeWeapon){
            setPlayer(currentPlayer => ({...currentPlayer, attackCooldown: p.activeWeapon.type === 'knife' ? 0.3 : 0.6 }));
            if(p.activeWeapon.type === 'knife'){
                createParticles(p.x+p.width/2, p.y+p.height/2, 1, {color: 'white', minSize: TILE_SIZE*2, maxSize: TILE_SIZE*2, minLife: 0.1, maxLife: 0.15, gravity: 0, particleType: 'slash'})
                // Damage check for knife
                w.npcs.forEach(npc => {
                    if (npc.type === 'enemy' && Math.hypot((p.x-npc.x), (p.y-npc.y)) < TILE_SIZE * 1.5) {
                        setWorld(currentWorld => {
                           const newNpcs = currentWorld.npcs.map(n => n.id === npc.id ? {...n, health: n.health - 25} : n);
                           return {...currentWorld, npcs: newNpcs};
                        });
                        createParticles(npc.x + npc.width / 2, npc.y + npc.height / 2, 10, { color: '#ffeb3b', minSize: 3, maxSize: 6, maxLife: 0.4, gravity: 0 });
                    }
                });

            } else if(p.activeWeapon.type === 'gun' && p.activeWeapon.ammo > 0) {
                 setPlayer(currentPlayer => ({...currentPlayer, activeWeapon: {...currentPlayer.activeWeapon, ammo: currentPlayer.activeWeapon.ammo - 1}}));
                 const speed = 1000;
                 const angle = Math.atan2((clickPos.y - (p.y + p.height / 2)), (clickPos.x - (p.x + p.width / 2)));
                 const newProjectile = {
                    id: Math.random(), type: 'bullet', x: p.x + p.width / 2, y: p.y + p.height / 2,
                    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                    ownerId: 'player', power: 40, lifespan: 1, rotation: angle,
                };
                setWorld(currentWorld => ({ ...currentWorld, projectiles: [...currentWorld.projectiles, newProjectile] }));
            }
            return;
        }

        // Axe Throwing
        if (selectedItem.id === 'axe') {
            setPlayer(currentPlayer => ({...currentPlayer, attackCooldown: 0.7}));
            
            const speed = 600;
            let angle = 0;
            if (deviceType === 'desktop' && clickPos) {
                 angle = Math.atan2((clickPos.y - (p.y + p.height / 2)), (clickPos.x - (p.x + p.width / 2)));
            } else { // Mobile direction
                 if (p.direction === 'up') angle = -Math.PI / 2;
                 else if (p.direction === 'down') angle = Math.PI / 2;
                 else if (p.direction === 'left') angle = Math.PI;
                 else angle = 0;
            }

            const newProjectile = {
                id: Math.random(), type: 'axe', x: p.x + p.width / 2, y: p.y + p.height / 2,
                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                ownerId: 'player', power: p.attackPower, lifespan: 0.8, rotation: 0
            };
            setWorld(currentWorld => ({ ...currentWorld, projectiles: [...currentWorld.projectiles, newProjectile] }));
            return;
        }

        // Environmental interaction
        if (clickPos) { // from desktop click
             const tileX = Math.floor(clickPos.x / TILE_SIZE);
             const tileY = Math.floor(clickPos.y / TILE_SIZE);
             setPlayer(currentPlayer => ({ ...currentPlayer, targetX: clickPos.x - p.width/2, targetY: clickPos.y - p.height, pendingAction: {type: 'interact', tileX, tileY} }));
        } else { // from mobile action button
            if (p.direction === 'up') targetY -= actionRange;
            else if (p.direction === 'down') targetY += actionRange;
            else if (p.direction === 'left') targetX -= actionRange;
            else if (p.direction === 'right') targetX += actionRange;
            const tileX = Math.floor(targetX / TILE_SIZE);
            const tileY = Math.floor(targetY / TILE_SIZE);
            executeInteraction(p, tileX, tileY);
        }
    }, [deviceType, setPlayer, setWorld, executeInteraction]);

    useEffect(() => {
        if(deviceType === 'mobile') {
            playerActionRef.current = () => performAction();
        } else {
            playerActionRef.current = null;
        }
    }, [deviceType, performAction, playerActionRef]);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let lastTime = performance.now();

        const gameLoop = (currentTime) => {
            animationFrameId = window.requestAnimationFrame(gameLoop);
            const deltaTime = (currentTime - lastTime) / 1000;
            lastTime = currentTime;
            
            const { player: p_current, time: t_current, world: w_current, isGameOver: isGameOver_current, tutorial: tut_current } = stateRef.current;
            if(isGameOver_current) return;
            
            if(p_current){
                const newDayTimer = t_current.dayTimer + deltaTime;
                if (newDayTimer >= DAY_LENGTH_SECONDS) {
                    setTime(t => ({...t, day: t.day + 1, dayTimer: 0}));
                } else {
                    setTime(t => ({...t, dayTimer: newDayTimer}));
                }
            }


            // --- PLAYER UPDATE LOGIC ---
            if(p_current){
                 let dx = 0, dy = 0;
                 let isMoving = false;
                 let newPlayerState = { ...p_current, attackCooldown: Math.max(0, p_current.attackCooldown - deltaTime) };

                 if (p_current.activeWeapon) {
                     if(p_current.activeWeapon.type === 'knife') {
                         newPlayerState.activeWeapon = {...p_current.activeWeapon, duration: p_current.activeWeapon.duration - deltaTime };
                     }
                     if (newPlayerState.activeWeapon.duration <= 0 || (newPlayerState.activeWeapon.type === 'gun' && newPlayerState.activeWeapon.ammo <= 0)) {
                         newPlayerState.activeWeapon = null;
                     }
                 }
                 
                 if (tut_current.isActive && tut_current.step !== 'move') {
                    newPlayerState.joystickVector = {x: 0, y: 0};
                 } else {
                     if (deviceType === 'mobile') {
                         const speed = p_current.speed * deltaTime;
                         dx = p_current.joystickVector.x * speed;
                         dy = p_current.joystickVector.y * speed;
                         newPlayerState.x += dx;
                         newPlayerState.y += dy;
                         isMoving = Math.abs(p_current.joystickVector.x) > 0.1 || Math.abs(p_current.joystickVector.y) > 0.1;
                     } else { // Desktop movement
                         const dist = Math.hypot(p_current.targetX - p_current.x, p_current.targetY - p_current.y);
                         isMoving = dist > 5;
                         if(isMoving){
                            const vecX = p_current.targetX - p_current.x;
                            const vecY = p_current.targetY - p_current.y;
                            dx = (vecX / dist) * p_current.speed * deltaTime;
                            dy = (vecY / dist) * p_current.speed * deltaTime;
                            newPlayerState.x += dx;
                            newPlayerState.y += dy;
                            if (tut_current.isActive && tut_current.step === 'move') {
                                setTutorial({ ...tut_current, step: 'select_item' });
                            }
                         }
                     }
                 }
                 newPlayerState.isMoving = isMoving;

                 if (isMoving) {
                    if (Math.abs(dx) > Math.abs(dy)) {
                        newPlayerState.direction = dx > 0 ? 'right' : 'left';
                    } else {
                        if(dy !== 0) newPlayerState.direction = dy > 0 ? 'down' : 'up';
                    }
                    newPlayerState.animFrame = (p_current.animFrame + deltaTime * 8) % 4;
                 } else {
                     newPlayerState.animFrame = 0;
                     if(p_current.pendingAction && deviceType === 'desktop') {
                         const {type, tileX, tileY} = p_current.pendingAction;
                         executeInteraction(p_current, tileX, tileY);
                         newPlayerState.pendingAction = null;
                     }
                 }
                 
                 newPlayerState.x = Math.max(0, Math.min(w_current.width - newPlayerState.width, newPlayerState.x));
                 newPlayerState.y = Math.max(0, Math.min(w_current.height - newPlayerState.height, newPlayerState.y));
                 
                 setPlayer(newPlayerState);
            }
            
            // --- WORLD UPDATE ---
            setWorld(w => {
                let newNpcs = [...w.npcs];
                let newProjectiles = [...w.projectiles];
                let newWeaponDrops = [...w.weaponDrops];
                
                // Weapon Drop Spawner
                weaponDropTimer -= deltaTime;
                if (weaponDropTimer <= 0) {
                    weaponDropTimer = 15 + Math.random() * 15; // Spawn every 15-30 seconds
                    if (newWeaponDrops.length < 3) {
                        newWeaponDrops.push({
                            id: Math.random(),
                            type: Math.random() < 0.6 ? 'knife' : 'gun',
                            x: Math.random() * w.width,
                            y: Math.random() * w.height,
                            lifespan: 20
                        });
                    }
                }
                
                // Update weapon drops and check pickup
                newWeaponDrops = newWeaponDrops.map(drop => {
                    drop.lifespan -= deltaTime;
                    if (p_current && Math.hypot(p_current.x - drop.x, p_current.y - drop.y) < TILE_SIZE * 0.8) {
                        setPlayer(currentPlayer => ({
                            ...currentPlayer,
                            activeWeapon: drop.type === 'knife' ? { type: 'knife', duration: 15 } : { type: 'gun', ammo: 8 }
                        }));
                        createParticles(drop.x, drop.y, 20, {color: '#fde047', maxLife: 1.2});
                        drop.lifespan = 0;
                    }
                    return drop;
                }).filter(d => d.lifespan > 0);


                // Update projectiles and check collisions
                newProjectiles = newProjectiles.map(proj => {
                    proj.x += proj.vx * deltaTime;
                    proj.y += proj.vy * deltaTime;
                    proj.lifespan -= deltaTime;
                    if(proj.type === 'axe') proj.rotation += 20 * deltaTime;

                    for (let i = newNpcs.length - 1; i >= 0; i--) {
                        const npc = newNpcs[i];
                        if (npc.id !== proj.ownerId && Math.hypot(proj.x - (npc.x + npc.width / 2), proj.y - (npc.y + npc.height / 2)) < npc.width / 2) {
                            setWorld(cw => ({...cw, screenShake: 5}));
                            createParticles(proj.x, proj.y, 10, { color: '#ffeb3b', minSize: 3, maxSize: 6, maxLife: 0.4, gravity: 0 });
                            const newHealth = (npc.health || 0) - proj.power;
                            if (newHealth <= 0 && npc.type === 'enemy') {
                                if (npc.isBoss) {
                                    updateLevelObjective(1);
                                }
                                addPlayerXP(npc.subType === 'wildman' ? 50 : 30);
                                checkQuestCompletion('kill_enemy', 1);
                                setPlayer(pl => ({...pl, gold: pl.gold + (npc.subType === 'wildman' ? 40 : 25) }));
                                createParticles(npc.x + npc.width / 2, npc.y + npc.height / 2, 30, { color: '#e53935', minSize: 2, maxSize: 5, maxLife: 1 });
                                newNpcs.splice(i, 1);
                                 if (tut_current.isActive && tut_current.step === 'combat') {
                                    setTutorial({ ...tut_current, step: 'objective' });
                                }
                            } else {
                                newNpcs[i] = { ...npc, health: newHealth };
                            }
                            proj.lifespan = 0; // Mark for removal
                            break; 
                        }
                    }
                    return proj;
                }).filter(proj => proj.lifespan > 0);


                const newObjects = w.objects.map(obj => { // Tree growth
                    let newObj = { ...obj };
                    if (newObj.type === 'tree' && newObj.growth < 1) {
                        let growthRate = (1 / (newObj.growthTime || 30)) * (1 - w.pollution * 0.8) * (newObj.waterLevel > 0 ? 1.5 : 0.5);
                        newObj.growth += growthRate * deltaTime;
                        if (newObj.growth >= 1) {
                            newObj.growth = 1;
                            createParticles(newObj.x + TILE_SIZE / 2, newObj.y, 10, { color: '#ffd700', minSize: 2, maxSize: 5, maxLife: 0.8, gravity: -0.5 })
                        }
                    }
                    return newObj;
                });

                newNpcs = newNpcs.map(npc => {
                    let newNpc = { ...npc };
                    if (npc.type === 'villager' || npc.type === 'gardener') {
                        newNpc.moveTimer = (npc.moveTimer || 5) - deltaTime;
                        if (newNpc.moveTimer <= 0) {
                            newNpc.moveTimer = 3 + Math.random() * 5;
                            const angle = Math.random() * 2 * Math.PI;
                            const dist = TILE_SIZE * (1 + Math.random() * 3);
                            newNpc.targetX = Math.max(0, Math.min(w.width - TILE_SIZE, newNpc.x + Math.cos(angle) * dist));
                            newNpc.targetY = Math.max(0, Math.min(w.height - TILE_SIZE, newNpc.y + Math.sin(angle) * dist));
                        }
                    } else if (npc.type === 'enemy' && p_current) {
                        const distToPlayer = Math.hypot(p_current.x - npc.x, p_current.y - npc.y);
                        if (distToPlayer < npc.visionRange) {
                            newNpc.targetX = p_current.x;
                            newNpc.targetY = p_current.y;
                        }
                        if (distToPlayer < npc.attackRange) { // Attack player
                            newNpc.targetX = npc.x; newNpc.targetY = npc.y; // Stop moving
                            newNpc.attackCooldown = Math.max(0, (npc.attackCooldown || 1.5) - deltaTime);
                            if (newNpc.attackCooldown <= 0 && !tut_current.isActive) {
                                newNpc.attackCooldown = 1.5; // Reset cooldown
                                setWorld(cw => ({...cw, screenShake: 8}));
                                setPlayer(p => {
                                    if(!p) return p;
                                    const newHealth = p.health - npc.attackPower;
                                    createParticles(p.x + p.width/2, p.y + p.height/2, 10, { color: '#ef4444', maxSpeed: 100, maxLife: 0.5 });
                                    if(newHealth <= 0) setGameOver(true);
                                    return {...p, health: newHealth};
                                });
                            }
                        }
                    }

                    if (newNpc.targetX !== null && newNpc.targetY !== null) { // Generic move logic
                        const dist = Math.hypot(newNpc.targetX - newNpc.x, newNpc.targetY - newNpc.y);
                        if (dist > 5) {
                            newNpc.x += (newNpc.targetX - newNpc.x) / dist * newNpc.speed * deltaTime;
                            newNpc.y += (newNpc.targetY - newNpc.y) / dist * newNpc.speed * deltaTime;
                        } else {
                            if (npc.type === 'villager' || npc.type === 'gardener') newNpc.targetX = null;
                        }
                    }
                    return newNpc;
                });

                const newParticles = w.particles.map(p => ({ ...p, x: p.x + p.vx * deltaTime, y: p.y + p.vy * deltaTime, vy: p.vy + p.gravity, lifespan: p.lifespan - deltaTime })).filter(p => p.lifespan > 0);
                const newScreenShake = Math.max(0, w.screenShake - 15 * deltaTime);
                return { ...w, objects: newObjects, particles: newParticles, npcs: newNpcs, projectiles: newProjectiles, weaponDrops: newWeaponDrops, screenShake: newScreenShake };
            });

            // --- DRAW LOGIC ---
            const { player: p, world: w, time: t } = stateRef.current;
            if (!p || !w.map.length) return;
            
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            const scale = Math.min(canvas.width / w.width, canvas.height / w.height);
            const viewWidth = canvas.width / scale;
            const viewHeight = canvas.height / scale;

            ctx.save();
            const shakeX = (Math.random() - 0.5) * w.screenShake;
            const shakeY = (Math.random() - 0.5) * w.screenShake;
            ctx.translate(shakeX, shakeY);
            
            // Camera follows player
            let camX = p.x + p.width / 2 - viewWidth / 2;
            let camY = p.y + p.height / 2 - viewHeight / 2;
            camX = Math.max(0, Math.min(w.width - viewWidth, camX));
            camY = Math.max(0, Math.min(w.height - viewHeight, camY));

            ctx.scale(scale, scale);
            ctx.translate(-camX, -camY);

            ctx.clearRect(camX, camY, viewWidth, viewHeight);
            ctx.fillStyle = SEASONS[t.season].color;
            ctx.fillRect(camX, camY, viewWidth, viewHeight);
            
            const startY = Math.floor(camY / TILE_SIZE);
            const endY = Math.ceil((camY + viewHeight) / TILE_SIZE);
            const startX = Math.floor(camX / TILE_SIZE);
            const endX = Math.ceil((camX + viewWidth) / TILE_SIZE);

            for (let y = startY; y < endY; y++) {
                for (let x = startX; x < endX; x++) {
                    if (!w.map[y] || !w.map[y][x]) continue;
                    const tile = w.map[y][x];
                    if (tile.type === 'grass') ctx.fillStyle = '#689f38';
                    else if (tile.type === 'forest_floor') ctx.fillStyle = '#4e6131';
                    else if (tile.type === 'blight') ctx.fillStyle = '#6d4c41';
                    else if (tile.type === 'planted_soil') ctx.fillStyle = '#8d6e63';
                    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            }

            const entitiesToDraw = [...w.objects, ...w.npcs, ...w.weaponDrops, p];
            entitiesToDraw.sort((a, b) => (a.y + (a.height || TILE_SIZE)) - (b.y + (b.height || TILE_SIZE)));

            entitiesToDraw.forEach(entity => {
                if (entity.charType) drawPlayer(ctx, entity);
                else drawObject(ctx, entity);
            });

            w.projectiles.forEach(proj => drawProjectile(ctx, proj));

            w.particles.forEach(pt => {
                if (pt.particleType === 'slash') {
                    ctx.globalAlpha = Math.max(0, pt.lifespan / pt.initialLife);
                    ctx.strokeStyle = pt.color;
                    ctx.lineWidth = 10;
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, pt.size/2, -Math.PI/4, Math.PI/4);
                    ctx.stroke();
                    ctx.lineWidth = 1;
                } else {
                    ctx.fillStyle = pt.color;
                    ctx.globalAlpha = Math.max(0, pt.lifespan / pt.initialLife);
                    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
                }
                ctx.globalAlpha = 1;
            });

            ctx.restore();
        };

        animationFrameId = window.requestAnimationFrame(gameLoop);
        return () => window.cancelAnimationFrame(animationFrameId);
    }, [context]);

    const drawHealthBar = (ctx, entity) => {
        if (entity.health < entity.maxHealth) {
            const barY = entity.isBoss ? entity.y - 14 : entity.y - 8;
            const barHeight = entity.isBoss ? 8 : 5;
            ctx.fillStyle = '#424242';
            ctx.fillRect(entity.x, barY, entity.width, barHeight);
            ctx.fillStyle = '#f44336';
            ctx.fillRect(entity.x, barY, entity.width * (entity.health / entity.maxHealth), barHeight);
        }
    };

    const drawObject = (ctx, obj) => {
        if(obj.type === 'tree') {
            const objX = obj.x + TILE_SIZE / 2;
            const objY = obj.y + TILE_SIZE;
            const growthScale = 0.4 + (obj.growth * 0.6);
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(objX - 5 * growthScale, objY - 20 * growthScale, 10 * growthScale, 20 * growthScale);
            ctx.fillStyle = obj.waterLevel > 0 ? '#4caf50' : '#cddc39';
            if (obj.growth < 1) ctx.fillStyle = '#9ccc65';
            ctx.beginPath(); ctx.arc(objX, objY - 25 * growthScale, TILE_SIZE * 0.45 * growthScale, 0, Math.PI * 2); ctx.fill();
        } else if (obj.type === 'ruin_wall') {
            ctx.fillStyle = '#78909c';
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
            ctx.fillStyle = '#546e7a';
            ctx.fillRect(obj.x+5, obj.y+5, obj.width-10, obj.height-10);
        } else if (obj.type === 'portal') {
             const portalTime = Date.now() / 1000;
             const grad = ctx.createRadialGradient(obj.x + obj.width/2, obj.y + obj.height/2, 5, obj.x + obj.width/2, obj.y + obj.height/2, obj.width/2);
             grad.addColorStop(0, `hsl(${portalTime * 50 % 360}, 100%, 70%)`);
             grad.addColorStop(1, `hsl(${(portalTime * 50 + 180) % 360}, 100%, 50%)`);
             ctx.fillStyle = grad;
             ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        } else if (obj.type === 'knife' || obj.type === 'gun') { // Weapon drops
            ctx.save();
            ctx.translate(obj.x + TILE_SIZE/2, obj.y + TILE_SIZE/2);
            ctx.font = `${TILE_SIZE}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = 0.5 + Math.sin(Date.now()/300) * 0.3;
            ctx.fillText(obj.type === 'knife' ? '🔪' : '🔫', 0, 0);
            ctx.restore();
        } else if (['villager', 'elder', 'gardener'].includes(obj.type)) {
            const isMoving = obj.targetX !== null;
            const legSwing = isMoving ? Math.sin(Date.now() / 150) * 4 : 0;
            ctx.fillStyle = "#4a4a4a";
            ctx.fillRect(obj.x + TILE_SIZE * 0.25, obj.y + TILE_SIZE * 0.8, TILE_SIZE * 0.2, TILE_SIZE * 0.3);
            ctx.fillRect(obj.x + TILE_SIZE * 0.55, obj.y + TILE_SIZE * 0.8 + legSwing, TILE_SIZE * 0.2, TILE_SIZE * 0.3);
            ctx.font = `${TILE_SIZE * 0.9}px sans-serif`; ctx.textAlign = 'center';
            ctx.fillText(obj.portrait, obj.x + TILE_SIZE / 2, obj.y + TILE_SIZE * 0.9);
            drawHealthBar(ctx, obj);
        } else if (obj.type === 'enemy') {
            if (obj.subType === 'crawler') {
                ctx.fillStyle = obj.isBoss ? '#581c87' : '#991b1b';
                ctx.beginPath();
                ctx.ellipse(obj.x + obj.width/2, obj.y + obj.height * 0.7, obj.width/2, obj.height/2.5, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = 'white';
                const eyeY = obj.y + obj.height * 0.6;
                ctx.beginPath(); ctx.arc(obj.x + obj.width * 0.3, eyeY, obj.width * 0.1, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(obj.x + obj.width * 0.7, eyeY, obj.width * 0.1, 0, Math.PI*2); ctx.fill();
            } else if (obj.subType === 'wildman') {
                const isMoving = obj.targetX !== null;
                const legSwing = isMoving ? Math.sin(Date.now() / 150) * 4 : 0;
                ctx.fillStyle = obj.isBoss ? '#422006' : "#795548"; // Loincloth
                ctx.fillRect(obj.x + TILE_SIZE * 0.2, obj.y + TILE_SIZE * 0.8, TILE_SIZE * 0.2, TILE_SIZE * 0.3 + legSwing);
                ctx.fillRect(obj.x + TILE_SIZE * 0.6, obj.y + TILE_SIZE * 0.8, TILE_SIZE * 0.2, TILE_SIZE * 0.3 - legSwing);
                ctx.font = `${TILE_SIZE * (obj.isBoss ? 1.2 : 0.9)}px sans-serif`; ctx.textAlign = 'center';
                ctx.fillText(obj.portrait, obj.x + obj.width / 2, obj.y + obj.height * 0.9);
            }
            drawHealthBar(ctx, obj);
        } else if (obj.type === 'rock') {
            ctx.fillStyle = '#78909c';
            ctx.beginPath();
            ctx.moveTo(obj.x + TILE_SIZE * 0.2, obj.y + TILE_SIZE * 0.8);
            ctx.lineTo(obj.x + TILE_SIZE * 0.8, obj.y + TILE_SIZE * 0.8);
            ctx.lineTo(obj.x + TILE_SIZE * 0.9, obj.y + TILE_SIZE * 0.5);
            ctx.lineTo(obj.x + TILE_SIZE * 0.5, obj.y + TILE_SIZE * 0.2);
            ctx.lineTo(obj.x + TILE_SIZE * 0.1, obj.y + TILE_SIZE * 0.4);
            ctx.closePath();
            ctx.fill();
        } else if (obj.type === 'flower_patch') {
            ctx.fillStyle = '#ec407a';
            ctx.beginPath(); ctx.arc(obj.x + TILE_SIZE * 0.3, obj.y + TILE_SIZE * 0.3, TILE_SIZE * 0.15, 0, 2*Math.PI); ctx.fill();
            ctx.fillStyle = '#ab47bc';
            ctx.beginPath(); ctx.arc(obj.x + TILE_SIZE * 0.7, obj.y + TILE_SIZE * 0.4, TILE_SIZE * 0.15, 0, 2*Math.PI); ctx.fill();
            ctx.fillStyle = '#ffee58';
            ctx.beginPath(); ctx.arc(obj.x + TILE_SIZE * 0.5, obj.y + TILE_SIZE * 0.7, TILE_SIZE * 0.15, 0, 2*Math.PI); ctx.fill();
        }
    };

    const drawProjectile = (ctx, proj) => {
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.rotate(proj.rotation);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (proj.type === 'axe') {
            ctx.font = `${TILE_SIZE * 0.8}px sans-serif`;
            ctx.fillText('🪓', 0, 0);
        } else if (proj.type === 'bullet') {
            ctx.fillStyle = '#fde047';
            ctx.fillRect(-8, -2, 16, 4);
        }
        ctx.restore();
    };

    const drawPlayer = (ctx, p) => {
        ctx.save();
        ctx.translate(p.x + p.width/2, p.y + p.height);
        
        const legSwing = Math.sin(p.animFrame * Math.PI) * 5;
        
        ctx.fillStyle = "#4a4a4a"; // Dark gray pants
        const legY = -p.height * 0.5;
        const legHeight = p.height * 0.5;
        if(p.direction === 'down' || p.direction === 'up'){
            ctx.fillRect(-p.width * 0.3, legY, p.width * 0.2, legHeight); // Left leg
            ctx.fillRect(p.width * 0.1, legY + (p.isMoving ? legSwing : 0), p.width * 0.2, legHeight); // Right leg
        } else {
             ctx.fillRect(-p.width * 0.3, legY, p.width * 0.2, legHeight + (p.isMoving ? -legSwing/2 : 0));
             ctx.fillRect(p.width * 0.1, legY, p.width * 0.2, legHeight + (p.isMoving ? legSwing/2 : 0));
        }
        
        const bodyColor = { boy: '#3498db', girl: '#e91e63', adventurer: '#8d6e63', mystic: '#673ab7'}[p.charType];
        ctx.fillStyle = bodyColor;
        ctx.fillRect(-p.width * 0.4, -p.height * 0.85, p.width * 0.8, p.height * 0.45);
        
        if(p.direction === 'down') {
           ctx.fillRect(-p.width * 0.45, -p.height * 0.8, p.width * 0.15, p.height * 0.4);
           ctx.fillRect(p.width * 0.3, -p.height * 0.8, p.width * 0.15, p.height * 0.4);
        } else if (p.direction === 'left') {
            ctx.fillRect(-p.width*0.05, -p.height * 0.8 + (p.isMoving ? -legSwing : 0), p.width * 0.15, p.height * 0.4);
        } else if (p.direction === 'right') {
            ctx.fillRect(-p.width*0.1, -p.height * 0.8 + (p.isMoving ? legSwing : 0), p.width * 0.15, p.height * 0.4);
        }

        ctx.fillStyle = "#ffdab9"; // Skin
        ctx.beginPath(); ctx.arc(0, -p.height * 0.8, p.width * 0.35, 0, Math.PI * 2); ctx.fill();
        
        const hairColor = { boy: '#2c3e50', girl: '#f39c12', adventurer: '#5d4037', mystic: '#e0e0e0'}[p.charType];
        ctx.fillStyle = hairColor; 
        if(p.direction === 'up'){
            ctx.fillRect(-p.width * 0.35, -p.height, p.width * 0.7, p.height * 0.25);
        } else {
             ctx.beginPath(); ctx.arc(0, -p.height * 0.85, p.width * 0.38, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();
    }
    
    const handleCanvasMouseMove = (e) => {
        if (!player || deviceType !== 'desktop') return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        const scale = Math.min(rect.width / world.width, rect.height / world.height);
        const viewWidth = rect.width / scale;
        const viewHeight = rect.height / scale;

        let camX = player.x + player.width / 2 - viewWidth / 2;
        let camY = player.y + player.height / 2 - viewHeight / 2;
        camX = Math.max(0, Math.min(world.width - viewWidth, camX));
        camY = Math.max(0, Math.min(world.height - viewHeight, camY));
        
        const mouseX = (e.clientX - rect.left) / scale + camX;
        const mouseY = (e.clientY - rect.top) / scale + camY;
        setMousePos({ x: mouseX, y: mouseY });
    }

    const handleCanvasClick = (e) => {
        if (!player || deviceType !== 'desktop' || tutorial.isActive) return;
        
        const clickX = context.mousePos.x;
        const clickY = context.mousePos.y;

        for (const npc of world.npcs) {
            const npcCenterX = npc.x + npc.width / 2;
            const npcCenterY = npc.y + npc.height / 2;
            if (Math.hypot(clickX - npcCenterX, clickY - npcCenterY) < npc.width) {
                 setPlayer(p => ({ ...p, targetX: p.x, targetY: p.y, pendingAction: null }));
                 if(npc.type === 'enemy') {
                    performAction({ x: clickX, y: clickY });
                } else {
                    setActiveDialogue({ npc });
                }
                return;
            }
        }
        
        performAction({ x: clickX, y: clickY });
    };

    return <canvas ref={canvasRef} onMouseMove={handleCanvasMouseMove} onClick={handleCanvasClick} className="game-canvas" />;
};

// --- Main App Component ---
function AppContent() {
    const [page, setPage] = useState('start');
    const [activeModal, setActiveModal] = useState(null);
    const { setupLevel, player, setDailyRewardAvailable, setDeviceType, deviceType, isGameOver, setGameOver, isLoading, tutorial } = useContext(GameContext);

    useEffect(() => {
        const lastLogin = localStorage.getItem('lastLoginDate');
        const today = new Date().toDateString();
        if(lastLogin !== today){
            setDailyRewardAvailable(true);
        }
    }, [setDailyRewardAvailable]);
    
    useEffect(() => {
        if(isGameOver) {
            setPage('game-over');
        }
    }, [isGameOver]);

    const handleStartGame = () => setPage('device-select');
    
    const handleDeviceSelect = (device) => {
        setDeviceType(device);
        setPage('char-select');
    };

    const handleCharConfirm = (charType) => {
        if (charType) {
            setupLevel(0, charType);
            setPage('loading');
        }
    };
    
    useEffect(() => {
        if (page === 'loading' && !isLoading) {
            setPage('game');
        }
    }, [isLoading, page]);

    const handleRestart = () => {
        setGameOver(false);
        setPage('char-select');
    }

    const renderPage = () => {
        switch (page) {
            case 'start': return <StartScreen onStart={handleStartGame} onNavigate={setPage} />;
            case 'loading': return <LoadingScreen />;
            case 'game-over': return <GameOverScreen onRestart={handleRestart} />;
            case 'device-select': return <DeviceSelectScreen onConfirm={handleDeviceSelect} onBack={() => setPage('start')} />;
            case 'char-select': return <CharacterSelectScreen onConfirm={handleCharConfirm} onBack={() => setPage('device-select')} />;
            case 'how-to-play': return <HowToPlayScreen onBack={() => setPage('start')} />;
            case 'game': return (
                <div className={`game-world device-${deviceType}`}>
                    <GameCanvas />
                    <HUD onOpenModal={setActiveModal} />
                    <DialogueBox />
                    <MobileControls />
                    <TutorialOverlay />
                </div>
            );
            default: return <StartScreen onStart={handleStartGame} onNavigate={setPage} />;
        }
    };

    return (
        <div className="app-container">
            {renderPage()}
            {player && !isGameOver && (
                <>
                    <ShopModal isOpen={activeModal === 'shop'} onClose={() => setActiveModal(null)} />
                    <QuestLogModal isOpen={activeModal === 'quest-log'} onClose={() => setActiveModal(null)} />
                    <SkillTreeModal isOpen={activeModal === 'skill-tree'} onClose={() => setActiveModal(null)} />
                    <RedemptionHubModal isOpen={activeModal === 'redemption-hub'} onClose={() => setActiveModal(null)} />
                    <MobileMenuModal isOpen={activeModal === 'mobile-menu'} onClose={() => setActiveModal(null)} onOpenModal={setActiveModal} />
                    <DailyWheelModal isOpen={activeModal === 'daily-reward'} onClose={() => setActiveModal(null)} />
                </>
            )}
            <MessageBox />
        </div>
    );
}

function App() {
    return (
        <GameProvider>
            <AppContent />
        </GameProvider>
    );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
