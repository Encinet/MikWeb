import type { Builder } from '@/modules/building/model/building-types';

export function sortBuildersByWeight(builders: Builder[]): Builder[] {
  return [...builders].sort(
    (leftBuilder, rightBuilder) => rightBuilder.weight - leftBuilder.weight,
  );
}
