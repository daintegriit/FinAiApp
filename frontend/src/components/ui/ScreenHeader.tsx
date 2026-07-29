import {
  View,
  Text,
  TouchableOpacity,
} from "react-native";

import { Feather } from "@expo/vector-icons";

import { useRouter } from "expo-router";

export default function ScreenHeader({
  title,
}: {
  title: string;
}) {

  const router = useRouter();

  return (

    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 24,
      }}
    >

      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          marginRight: 14,
        }}
      >
        <Feather
          name="chevron-left"
          size={28}
          color="black"
        />
      </TouchableOpacity>

      <Text
        style={{
          fontSize: 28,
          fontWeight: "700",
        }}
      >
        {title}
      </Text>

    </View>
  );
}