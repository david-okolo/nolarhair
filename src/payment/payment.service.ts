import { Injectable } from '@nestjs/common';
import { PaymentDriver } from './interface/payment-driver.interface';
import { IPaymentInitializeArg, IPaymentInitializeResult } from './interface/payment.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Payment } from '../entities/payment.entity';
import { Repository } from 'typeorm';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class PaymentService {

    constructor(
        private driver: PaymentDriver,
        @InjectRepository(Payment) private paymentRepository: Repository<Payment>,
        private logger: LoggerService
    ) {
        this.logger.setContext('Payment Service');
    }

    async initializePayment(data: IPaymentInitializeArg): Promise<IPaymentInitializeResult> | null{
        const initResult = await this.driver.initialize(data).catch(e => {
            this.logger.error(e.message, e.stack);
        });

        if(initResult)
        {
            await this.paymentRepository.save({
                authorizationUrl: initResult.url,
                bookingReference: initResult.reference,
                amount: data.amount
            }).catch(e => {
                this.logger.error(e.message, e.stack)
            });
        }

        return initResult || null;
    }

    async verifyPayment(reference: string): Promise<boolean> {

        const verification = await this.driver.verify(reference).catch(e => {
            this.logger.error(e.message, e.stack)
            throw e;
        });

        if(verification && verification.status) {
            await this.paymentRepository.update(
                { 
                    bookingReference: reference
                },
                {
                    verified: true,
                    success: true
                }
            ).catch(e => {
                throw e;
            });
        }

        return verification ? true : false;
    }
}
