export const profileInitialValue = (data = null) => {
    if(data) {
        return {
            first_name:data?.first_name ?? "",
            last_name:data?.last_name ?? "",
            username:data?.username ?? "",
            bio:data?.bio ?? "",
            email : data.email ?? "",
            meta: {
                display_name: data.meta?.display_name ?? "",
                pronouns: data.meta?.pronouns ?? "",
                date_of_birth: data.meta?.date_of_birth ?? "",
                follow_privacy: {
                    followers: data.meta?.follow_privacy?.followers ?? "everyone",
                    following: data.meta?.follow_privacy?.following ?? "everyone",
                },
                 website_url :data.meta.website_url ?? "",
                social_links: {
                    facebook: data.meta?.social_links?.facebook,
                    x: data.meta?.social_links?.x,
                    youtube: data.meta?.social_links?.youtube,
                    instagram: data.meta?.social_links?.instagram,
                    linkedin: data.meta?.social_links?.linkedin,
                }
            }
        }
    }

    return {
        first_name: "",
        last_name: "",
        username: "",
        bio: "",
        email : "",
        meta: {
            display_name: "",
            pronouns: "",
            date_of_birth: "",
            follow_privacy: {
                followers: "everyone",
                following: "everyone",
            },
            website_url :"",
            social_links: {
                facebook: "",
                x: "",
                youtube: "",
                instagram: "",
                linkedin: "",
            }
        }
    }
}