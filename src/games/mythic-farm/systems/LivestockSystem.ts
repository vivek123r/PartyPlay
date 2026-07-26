import type { FarmState, AnimalEntity, AnimalSpecies, AnimalConfig } from '../types';
import type { AudioSynthesizer } from '../utils/AudioSynthesizer';

export const ANIMAL_CONFIGS: Record<AnimalSpecies, AnimalConfig> = {
  golden_goat: {
    species: 'golden_goat',
    name: 'Golden Goat',
    housing: 'pasture',
    cost: 800,
    feedType: 'wheat',
    itemYield: 'golden_milk',
    basePrice: 180,
    productTimeDays: 1,
    specialAbility: 'Produces Golden Milk daily when fed',
  },
  astral_bee: {
    species: 'astral_bee',
    name: 'Astral Bee',
    housing: 'apiary',
    cost: 500,
    feedType: 'sunflower',
    itemYield: 'astral_honey',
    basePrice: 150,
    productTimeDays: 1,
    specialAbility: 'Gathers Astral Honey',
  },
  silk_moth: {
    species: 'silk_moth',
    name: 'Silk Moth',
    housing: 'cocoon_pen',
    cost: 600,
    feedType: 'elder_leaf',
    itemYield: 'silk_thread',
    basePrice: 220,
    productTimeDays: 2,
    specialAbility: 'Spins fine Silk Thread',
  },
  feathered_chocobo: {
    species: 'feathered_chocobo',
    name: 'Feathered Chocobo',
    housing: 'coop',
    cost: 1200,
    feedType: 'crystal_berry',
    itemYield: 'golden_egg',
    basePrice: 350,
    productTimeDays: 2,
    specialAbility: 'Lays rare Golden Eggs',
  },
};

export class LivestockSystem {
  private farmState: FarmState;
  private audioSynthesizer: AudioSynthesizer | null;
  private animals: AnimalEntity[] = [];

  constructor(farmState: FarmState, audioSynthesizer: AudioSynthesizer | null = null) {
    this.farmState = farmState;
    this.audioSynthesizer = audioSynthesizer;
    this.animals = farmState.animals || [];
    this.farmState.animals = this.animals;
  }

  /**
   * Process daily animal feeding, product generation, and affection decay if unfed.
   */
  public processDailyLivestock(): void {
    for (const animal of this.animals) {
      if (animal.fedToday) {
        animal.productReady = true;
        animal.affection = Math.min(1000, animal.affection + 10);
      } else {
        animal.productReady = false;
        animal.affection = Math.max(0, animal.affection - 15);
      }

      // Reset daily flags for the new day
      animal.fedToday = false;
      animal.groomedToday = false;
      animal.daysOld = (animal.daysOld || 0) + 1;
    }
  }

  /**
   * Feed an animal with its preferred food item.
   */
  public feedAnimal(animalId: string): boolean {
    const animal = this.animals.find((a) => a.id === animalId);
    if (!animal || animal.fedToday) return false;

    const config = ANIMAL_CONFIGS[animal.species];
    const feedItem = config.feedType;

    const inv = this.farmState.inventory;
    if (typeof inv === 'object' && !Array.isArray(inv)) {
      if (!inv[feedItem] || inv[feedItem] < 1) return false;
      inv[feedItem]--;
    }

    animal.fedToday = true;
    if (this.audioSynthesizer) {
      this.audioSynthesizer.playChimeSound();
    }
    return true;
  }

  /**
   * Pet / Groom an animal to boost affection rating.
   */
  public groomAnimal(animalId: string): boolean {
    const animal = this.animals.find((a) => a.id === animalId);
    if (!animal || animal.groomedToday) return false;

    animal.groomedToday = true;
    animal.affection = Math.min(1000, animal.affection + 25);

    if (this.audioSynthesizer) {
      this.audioSynthesizer.playChimeSound();
    }
    return true;
  }

  /**
   * Harvest ready animal product (Golden Milk, Astral Honey, Silk Thread, Golden Eggs).
   */
  public harvestProduct(animalId: string): string | null {
    const animal = this.animals.find((a) => a.id === animalId);
    if (!animal || !animal.productReady) return null;

    const config = ANIMAL_CONFIGS[animal.species];
    const item = config.itemYield;

    const inv = this.farmState.inventory;
    if (typeof inv === 'object' && !Array.isArray(inv)) {
      inv[item] = (inv[item] || 0) + 1;
    }

    animal.productReady = false;

    if (this.audioSynthesizer) {
      this.audioSynthesizer.playHarvestSound();
    }
    return item;
  }

  /**
   * Purchase a new mythical animal.
   */
  public buyAnimal(species: AnimalSpecies, name?: string): AnimalEntity | null {
    const config = ANIMAL_CONFIGS[species];
    if (this.farmState.coins < config.cost) return null;

    this.farmState.coins -= config.cost;

    const animal: AnimalEntity = {
      id: `animal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      species,
      name: name || config.name,
      x: 100 + Math.random() * 300,
      y: 100 + Math.random() * 200,
      fedToday: true,
      groomedToday: true,
      affection: 100,
      happiness: 100,
      productReady: false,
      daysOld: 1,
    };

    this.animals.push(animal);

    if (this.audioSynthesizer) {
      this.audioSynthesizer.playBuildSound();
    }
    return animal;
  }

  public getAnimals(): AnimalEntity[] {
    return this.animals;
  }
}
