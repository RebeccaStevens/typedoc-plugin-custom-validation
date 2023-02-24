import type { Application, ProjectReflection, Reflection } from "typedoc";
import { ParameterType, Validator, ReflectionKind } from "typedoc";

/**
 * Extend typedoc's options with the plugin's option using declaration merging.
 */
declare module "typedoc" {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions, jsdoc/require-jsdoc
  export interface TypeDocOptionMap {
    requireTags: {
      byKind: ByKindEntry[];
    };
  }
}

export type ByKindEntry = {
  kind: keyof typeof ReflectionKind;
  tags: string[];
};

export function load(app: Readonly<Application>) {
  // @ts-expect-error -- FIXME: ???
  app.options.addDeclaration({
    name: "requireTags",
    help: "The configuration object of the require-tags plugin.",
    type: ParameterType.Object,
  });

  app.validator.on(
    Validator.EVENT_RUN,
    (project: Readonly<ProjectReflection>) => {
      const requireTagsOptions = app.options.getValue(
        "requireTags"
      ) as unknown as {
        byKind: ByKindEntry[];
      };

      let m_kinds = requireTagsOptions.byKind.reduce(
        (prev, cur) => prev | ReflectionKind[cur.kind],
        0
      );

      const reflectionKindReplacements: Array<
        [oldKind: number, newKind: number]
      > = [
        [ReflectionKind.FunctionOrMethod, ReflectionKind.CallSignature],
        [ReflectionKind.Constructor, ReflectionKind.ConstructorSignature],
        [
          ReflectionKind.Accessor,
          ReflectionKind.GetSignature | ReflectionKind.SetSignature,
        ],
      ];

      for (const [oldKind, newKind] of reflectionKindReplacements) {
        m_kinds = (m_kinds | newKind) & ~oldKind;
      }

      const requireTagsByKind = new Map<number, string[]>(
        requireTagsOptions.byKind.map(
          ({ kind: kindString, tags }): [number, string[]] => {
            const kind = ReflectionKind[kindString];
            const realKind =
              reflectionKindReplacements.find(
                ([oldKind]) => (oldKind & kind) !== 0
              )?.[1] ?? kind;
            return [realKind, tags];
          }
        )
      );

      const reflections = project.getReflectionsByKind(m_kinds);
      const seen = new Set<Reflection>();

      for (const reflection of reflections) {
        if (seen.has(reflection)) {
          continue;
        }

        seen.add(reflection);

        if (!reflection.hasComment()) {
          app.logger.warn(
            `${reflection.getFriendlyFullName()} does not have any documentation.`
          );
          continue;
        }

        for (const tagName of requireTagsByKind.get(reflection.kind)!) {
          const tag = `@${tagName}` as const;
          if (reflection.comment!.getTags(tag).length === 0) {
            app.logger.warn(
              `${reflection.getFriendlyFullName()} does not have any ${tag} tags.`
            );
          }
        }
      }
    }
  );
}
