import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

const page = () => {
  return (
    <SignIn
      appearance={{
        baseTheme: dark,
      }}
    />
  );
};

export default page;
