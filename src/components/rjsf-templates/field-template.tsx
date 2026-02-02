import { Fieldset } from "@chakra-ui/react";
import {
  type FieldTemplateProps,
  type FormContextType,
  getTemplate,
  getUiOptions,
  type StrictRJSFSchema,
  type RJSFSchema,
} from "@rjsf/utils";
import { Field as ChakraField } from "@chakra-ui/react";

export const FieldTemplate = <
  T = never,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = never,
>(
  props: FieldTemplateProps<T, S, F>,
) => {
  const {
    id,
    children,
    classNames,
    style,
    disabled,
    displayLabel,
    hidden,
    label,
    onKeyRename,
    onKeyRenameBlur,
    onRemoveProperty,
    readonly,
    registry,
    required,
    rawErrors = [],
    rawDescription,
    schema,
    uiSchema,
  } = props;
  const uiOptions = getUiOptions<T, S, F>(uiSchema);
  const WrapIfAdditionalTemplate = getTemplate<
    "WrapIfAdditionalTemplate",
    T,
    S,
    F
  >("WrapIfAdditionalTemplate", registry, uiOptions);

  if (hidden) {
    return <div style={{ display: "none" }}>{children}</div>;
  }

  const hasErrors = rawErrors.length > 0;

  return (
    // eslint-disable-next-line react-hooks/static-components
    <WrapIfAdditionalTemplate
      classNames={classNames}
      style={style}
      disabled={disabled}
      id={id}
      label={label}
      displayLabel={displayLabel}
      rawDescription={rawDescription}
      onKeyRename={onKeyRename}
      onKeyRenameBlur={onKeyRenameBlur}
      onRemoveProperty={onRemoveProperty}
      readonly={readonly}
      required={required}
      schema={schema}
      uiSchema={uiSchema}
      registry={registry}
    >
      {schema.type === "object" ? (
        <Fieldset.Root
          disabled={disabled}
          invalid={rawErrors && rawErrors.length > 0}
        >
          <Fieldset.Content>{children}</Fieldset.Content>
        </Fieldset.Root>
      ) : (
        <ChakraField.Root
          disabled={disabled}
          invalid={hasErrors}
          required={required}
          readOnly={readonly}
        >
          {children}
          {displayLabel && rawDescription && (
            <ChakraField.HelperText>{rawDescription}</ChakraField.HelperText>
          )}
          {hasErrors &&
            rawErrors.map((error, i) => (
              <ChakraField.ErrorText key={i}>{error}</ChakraField.ErrorText>
            ))}
        </ChakraField.Root>
      )}
    </WrapIfAdditionalTemplate>
  );
};
