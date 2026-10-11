import {
  createSystem,
  defaultConfig,
  defineConfig,
  defineRecipe,
} from "@chakra-ui/react";


const borderStyle = {
  borderWidths: {
    borderWidth: { value: "1px" },
  },
  colors: {
    borderColor: { value: "var(--zencom-border-color)" },
  },
  radii: {
    borderRadius: { value: "4px" },
  },
};

const defaultBorderStyle = defineRecipe({
  base: {
    borderWidth: "borderWidth",
    borderColor: "borderColor",
    borderRadius: "borderRadius",
  },
});


const customConfig = defineConfig({
  theme: {
    tokens: {
      ...borderStyle,
    },
    recipes: {
      defaultBorderStyle: defaultBorderStyle,
    },
  },
});


export const theme = createSystem(defaultConfig, customConfig);
