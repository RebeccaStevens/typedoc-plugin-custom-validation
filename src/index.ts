import { Application, ParameterType, type ProjectReflection, type Reflection, ReflectionKind } from "typedoc";

export type CustomValidationOptions = {
  byKind: ByKindEntry[];
};

export type ByKindEntry = {
  kinds: keyof typeof ReflectionKind | Array<keyof typeof ReflectionKind>;
  tags?: string | string[];
  summary?: boolean;
  type?: "all" | "code-only" | "types-only";
};

export function load(app: Readonly<Application>): void {
  app.options.addDeclaration({
    name: "customValidation",
    help: "The configuration object of the custom-validation plugin.",
    type: ParameterType.Object,
  });

  app.on(Application.EVENT_VALIDATE_PROJECT, (project: Readonly<ProjectReflection>) => {
    const customValidationOptions = app.options.getValue("customValidation") as CustomValidationOptions;

    let mut_kinds = customValidationOptions.byKind
      .flatMap((by) => by.kinds)
      .map((kind) => ReflectionKind[kind])
      .reduce<number>((p, c) => (typeof c === "number" ? p | c : p), 0);

    const reflectionKindReplacements: Array<[oldKind: number, newKind: number]> = [
      [ReflectionKind.FunctionOrMethod, ReflectionKind.CallSignature],
      [ReflectionKind.Constructor, ReflectionKind.ConstructorSignature],
      [ReflectionKind.Accessor, ReflectionKind.GetSignature | ReflectionKind.SetSignature],
    ];

    for (const [oldKind, newKind] of reflectionKindReplacements) {
      mut_kinds = (mut_kinds | newKind) & ~oldKind;
    }

    type Requirements = {
      tags: string[];
      summary: boolean;
      type: NonNullable<ByKindEntry["type"]>;
    };

    const requirementsByKind = new Map<number, Requirements>(
      customValidationOptions.byKind.flatMap(({ kinds, tags, summary, type }) =>
        (Array.isArray(kinds) ? kinds : [kinds])
          .map((kindString): [number, Requirements] | null => {
            const kind = ReflectionKind[kindString];
            if (typeof kind !== "number") {
              return null;
            }
            const realKind = reflectionKindReplacements.find(([oldKind]) => (oldKind & kind) !== 0)?.[1] ?? kind;

            return [
              realKind,
              {
                tags: tags === undefined ? [] : Array.isArray(tags) ? tags : [tags],
                summary: summary ?? false,
                type: type ?? "all",
              },
            ];
          })
          .filter((data) => data !== null),
      ),
    );

    const reflections = project.getReflectionsByKind(mut_kinds);
    const seen = new Set<Reflection>();

    for (const reflection of reflections) {
      if (seen.has(reflection)) {
        continue;
      }
      seen.add(reflection);

      if (!reflection.hasComment() || reflection.comment!.isEmpty()) {
        app.logger.warn(`${reflection.getFriendlyFullName()} does not have any documentation.`);
        continue;
      }

      const requirements = requirementsByKind.get(reflection.kind);
      if (requirements !== undefined) {
        if (requirements.type !== "all") {
          const isTypeReflection = ((reflection.parent?.kind ?? 0) & ReflectionKind.SomeType) !== 0;

          if (
            (requirements.type === "code-only" && isTypeReflection) ||
            (requirements.type === "types-only" && !isTypeReflection)
          ) {
            continue;
          }
        }

        if (requirements.summary && reflection.comment!.summary.length === 0) {
          app.logger.warn(`${reflection.getFriendlyFullName()} does not have a summary.`);
        }

        for (const tagName of requirements.tags) {
          const tag: `@${string}` = tagName.startsWith("@") ? (tagName as `@${string}`) : `@${tagName}`;

          if (reflection.comment!.getTags(tag).length === 0) {
            app.logger.warn(`${reflection.getFriendlyFullName()} does not have any ${tag} tags.`);
          }
        }
      }
    }
  });
}
