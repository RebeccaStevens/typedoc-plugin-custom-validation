import type { ProjectReflection, Reflection } from "typedoc";
import { Application, ParameterType, ReflectionKind } from "typedoc";

export type CustomValidationOptions = {
  byKind: ByKindEntry[];
};

export type ByKindEntry = {
  kinds: keyof typeof ReflectionKind | Array<keyof typeof ReflectionKind>;
  tags?: string | string[];
  summary?: boolean;
  type?: "all" | "code-only" | "types-only";
};

export function load(app: Readonly<Application>) {
  app.options.addDeclaration({
    name: "customValidation",
    help: "The configuration object of the custom-validation plugin.",
    type: ParameterType.Object,
  });

  app.on(
    Application.EVENT_VALIDATE_PROJECT,
    (project: Readonly<ProjectReflection>) => {
      const customValidationOptions = app.options.getValue(
        "customValidation"
      ) as CustomValidationOptions;

      let m_kinds = customValidationOptions.byKind
        .flatMap((by) => by.kinds)
        .map((kind) => ReflectionKind[kind])
        .reduce((p, c) => p | c);

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

      type Requirements = {
        tags: string[];
        summary: boolean;
        type: NonNullable<ByKindEntry["type"]>;
      };

      const requirementsByKind = new Map<number, Requirements>(
        customValidationOptions.byKind.flatMap(
          ({ kinds, tags, summary, type }) =>
            (Array.isArray(kinds) ? kinds : [kinds]).map(
              (kindString): [number, Requirements] => {
                const kind = ReflectionKind[kindString];
                const realKind =
                  reflectionKindReplacements.find(
                    ([oldKind]) => (oldKind & kind) !== 0
                  )?.[1] ?? kind;

                return [
                  realKind,
                  {
                    tags:
                      tags === undefined
                        ? []
                        : Array.isArray(tags)
                        ? tags
                        : [tags],
                    summary: summary ?? false,
                    type: type ?? "all",
                  },
                ];
              }
            )
        )
      );

      const reflections = project.getReflectionsByKind(m_kinds);
      const seen = new Set<Reflection>();

      for (const reflection of reflections) {
        if (seen.has(reflection)) {
          continue;
        }
        seen.add(reflection);

        if (!reflection.hasComment() || reflection.comment!.isEmpty()) {
          app.logger.warn(
            `${reflection.getFriendlyFullName()} does not have any documentation.`
          );
          continue;
        }

        const requirements = requirementsByKind.get(reflection.kind);
        if (requirements !== undefined) {
          if (requirements.type !== "all") {
            const isTypeReflection =
              ((reflection.parent?.kind ?? 0) & ReflectionKind.SomeType) !== 0;

            if (
              (requirements.type === "code-only" && isTypeReflection) ||
              (requirements.type === "types-only" && !isTypeReflection)
            ) {
              continue;
            }
          }

          if (
            requirements.summary &&
            reflection.comment!.summary.length === 0
          ) {
            app.logger.warn(
              `${reflection.getFriendlyFullName()} does not have a summary.`
            );
          }

          for (const tagName of requirements.tags) {
            const tag: `@${string}` = tagName.startsWith("@")
              ? (tagName as `@${string}`)
              : `@${tagName}`;

            if (reflection.comment!.getTags(tag).length === 0) {
              app.logger.warn(
                `${reflection.getFriendlyFullName()} does not have any ${tag} tags.`
              );
            }
          }
        }
      }
    }
  );
}
