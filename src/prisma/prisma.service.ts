import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(config: ConfigService) {
    super({
      datasources: {
        db: {
          url: config.get('DATABASE_URL'),
        },
      },
    });
  }
  // cleanDb() {
  //   return this.$transaction([
  //     this.orderDetail.deleteMany(),
  //     this.paymentDetail.deleteMany(),
  //     this.user.deleteMany(),
  //     this.userAddress.deleteMany(),
  //     this.userPayment.deleteMany(),
  //     this.userShop.deleteMany(),
  //     this.cartItem.deleteMany(),
  //     this.post.deleteMany(),
  //     this.postComment.deleteMany(),
  //     this.postLike.deleteMany(),
  //     this.postMedia.deleteMany(),
  //     this.postShare.deleteMany(),
  //     this.postWithProducts.deleteMany(),
  //     this.product.deleteMany(),
  //     this.productCategory.deleteMany(),
  //     this.productDiscount.deleteMany(),
  //     this.productInventory.deleteMany(),
  //     this.shoppingSession.deleteMany(),
  //   ]);
  // }
}
