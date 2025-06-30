// Sprite management system with functional approach
export interface SpriteInfo {
  image: HTMLImageElement;
  width: number;
  height: number;
  loaded: boolean;
}

export const createSpriteManager = () => {
  const sprites = new Map<string, SpriteInfo>();
  const loadingPromises = new Map<string, Promise<void>>();

  const loadSprite = async (name: string, path: string): Promise<void> => {
    if (sprites.has(name)) {
      return;
    }

    if (loadingPromises.has(name)) {
      return loadingPromises.get(name);
    }

    const promise = new Promise<void>((resolve, reject) => {
      const image = new Image();
      
      image.onload = () => {
        const spriteInfo: SpriteInfo = {
          image,
          width: image.width,
          height: image.height,
          loaded: true,
        };
        sprites.set(name, spriteInfo);
        resolve();
      };

      image.onerror = () => {
        console.error(`Failed to load sprite: ${name} from ${path}`);
        reject(new Error(`Failed to load sprite: ${name}`));
      };

      image.src = path;
    });

    loadingPromises.set(name, promise);
    return promise;
  };

  const loadAllSprites = async (): Promise<void> => {
    const spritesToLoad = [
      { name: 'player', path: '/ship.png' },
      { name: 'boss', path: '/boss.png' },
      { name: 'basic-enemy', path: '/basic-enemy.png' },
      { name: 'fast-enemy', path: '/fast-enemy.png' },
      { name: 'shooter-enemy', path: '/shooter-enemy.png' },
      { name: 'heavy-enemy', path: '/heavy-enemy.png' },
      // Explosion animation frames
      { name: 'explosion1', path: '/explosion.png' },
      { name: 'explosion2', path: '/explosion2.png' },
      { name: 'explosion3', path: '/explosion3.png' },
      { name: 'explosion4', path: '/explosion4.png' },
      { name: 'explosion5', path: '/explosion5.png' },
      { name: 'explosion6', path: '/explosion6.png' },
      { name: 'explosion7', path: '/explosion7.png' },
    ];

    const loadPromises = spritesToLoad.map(sprite => 
      loadSprite(sprite.name, sprite.path)
    );

    try {
      await Promise.all(loadPromises);
      console.log('All sprites loaded successfully!');
    } catch (error) {
      console.error('Error loading sprites:', error);
    }
  };

  const getSprite = (name: string): SpriteInfo | null => {
    return sprites.get(name) || null;
  };

  const isLoaded = (name: string): boolean => {
    const sprite = sprites.get(name);
    return sprite ? sprite.loaded : false;
  };

  const getAllLoadedSprites = (): string[] => {
    return Array.from(sprites.keys()).filter(name => isLoaded(name));
  };

  const drawSprite = (
    ctx: CanvasRenderingContext2D,
    spriteName: string,
    x: number,
    y: number,
    width?: number,
    height?: number,
    rotation: number = 0
  ): boolean => {
    const sprite = getSprite(spriteName);
    if (!sprite || !sprite.loaded) {
      return false;
    }

    const drawWidth = width || sprite.width;
    const drawHeight = height || sprite.height;

    if (rotation !== 0) {
      ctx.save();
      ctx.translate(x + drawWidth / 2, y + drawHeight / 2);
      ctx.rotate(rotation);
      ctx.drawImage(sprite.image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();
    } else {
      ctx.drawImage(sprite.image, x, y, drawWidth, drawHeight);
    }

    return true;
  };

  // Extract bullets from sprite sheet
  const loadSpriteSheet = async (path: string): Promise<void> => {
    // This will be implemented when you provide the sprite sheet format details
    console.log('Sprite sheet loading will be implemented based on your specific format');
  };

  // Parse the shipwithshot.png sprite sheet
  const parseSpriteSheet = (
    image: HTMLImageElement, 
    shipsPerRow: number = 4,
    bulletOffset: number = 32
  ) => {
    const shipWidth = 32;
    const shipHeight = 32;
    const bulletWidth = 8;
    const bulletHeight = 16;
    
    return {
      getShipSprite: (shipIndex: number) => ({
        x: (shipIndex % shipsPerRow) * (shipWidth + bulletOffset),
        y: Math.floor(shipIndex / shipsPerRow) * shipHeight,
        width: shipWidth,
        height: shipHeight
      }),
      getBulletSprite: (shipIndex: number) => ({
        x: (shipIndex % shipsPerRow) * (shipWidth + bulletOffset) + shipWidth,
        y: Math.floor(shipIndex / shipsPerRow) * shipHeight + (shipHeight - bulletHeight) / 2,
        width: bulletWidth,
        height: bulletHeight
      })
    };
  };

  return {
    loadSprite,
    loadAllSprites,
    getSprite,
    isLoaded,
    getAllLoadedSprites,
    drawSprite,
    loadSpriteSheet,
    parseSpriteSheet,
  };
};

// Global sprite manager instance
export const spriteManager = createSpriteManager(); 