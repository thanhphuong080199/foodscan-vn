import { ANIMAL_GROUPS, type FoodRow } from '../data/types';

export type VegStatus = {
  isVegetarian: boolean;
  notes: string;
  // true when the local food-group forced a non-veg result over Gemini's answer
  overriddenByGroup: boolean;
};

// Group-only vegetarian read for the manual search screen, where there is no
// Gemini judgment to lean on. We can only say "not vegetarian" with confidence
// when the VTN food group is an animal source (meat/fish/egg); for everything
// else we stay silent rather than claim a food is chay we can't verify.
export type GroupVegStatus = { badge: 'non-veg'; notes: string } | null;

export function vegetarianFromGroup(group: string | null | undefined): GroupVegStatus {
  const isHardAnimal =
    group === ANIMAL_GROUPS.meat ||
    group === ANIMAL_GROUPS.aquatic ||
    group === ANIMAL_GROUPS.egg;
  if (isHardAnimal) {
    return {
      badge: 'non-veg',
      notes: `Thuộc nhóm "${group}" (nguồn động vật) nên không phù hợp ăn chay.`,
    };
  }
  return null;
}

// Combine Gemini's judgment with a local safety net: if the matched food sits in
// an animal group (meat/fish/egg), force non-veg regardless of what Gemini said.
// Dairy is lacto-vegetarian, so we don't force non-veg — just annotate.
export function resolveVegetarian(
  geminiIsVeg: boolean,
  geminiNotes: string,
  matched: FoodRow | null,
): VegStatus {
  const group = matched?.food_group;

  const isHardAnimal =
    group === ANIMAL_GROUPS.meat ||
    group === ANIMAL_GROUPS.aquatic ||
    group === ANIMAL_GROUPS.egg;

  if (isHardAnimal && geminiIsVeg) {
    return {
      isVegetarian: false,
      notes:
        `Thuộc nhóm "${group}" (nguồn động vật) nên không phù hợp ăn chay. ` +
        (geminiNotes ? `Ghi chú AI: ${geminiNotes}` : ''),
      overriddenByGroup: true,
    };
  }

  let notes = geminiNotes;
  if (group === ANIMAL_GROUPS.dairy && geminiIsVeg) {
    notes = `${geminiNotes} (Lưu ý: sản phẩm từ sữa — chỉ phù hợp ăn chay có sữa/lacto.)`.trim();
  }

  return {
    isVegetarian: isHardAnimal ? false : geminiIsVeg,
    notes,
    overriddenByGroup: isHardAnimal,
  };
}
